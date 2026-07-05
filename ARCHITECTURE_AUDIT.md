# TickTrack-Pro — Architecture Audit

_Full-stack architecture audit of the multi-tenant helpdesk SaaS (Next.js 14 App Router, Prisma/Postgres, Clerk, Paynow). Covers authentication & authorization, multi-tenant data isolation, data model & API design, billing & payments, general security posture, and frontend/ops/code-health._

---

## Executive summary

TickTrack-Pro is a feature-rich, shared-database multi-tenant SaaS with a genuinely competent core: ~85% of API routes correctly re-check role and tenant server-side, Clerk is wired in as the live auth system, the Paynow webhook verifies its hash, and there are real health/metrics endpoints. But the application is carrying two structural problems that dominate everything else:

1. **Isolation and enforcement are implemented per-route by hand, and the hand slips.** There is no shared "load this tenant-owned resource safely" helper and no middleware-level authorization. The result is a long tail of routes that authenticate but forget to authorize — including **unauthenticated-tier disclosure of any tenant's invoice PDF** and several cross-tenant read/write IDORs. Two independent auditors flagged the invoice-PDF route without coordination.

2. **The good infrastructure exists but is not wired in.** Centralized validation (`lib/validation.ts`), error handling (`lib/api-errors.ts`), pagination (`lib/pagination.ts`), the subscription guard, feature-gating, trial lockout, Redis, and the cache layer are all built — and imported by essentially zero live routes. Subscription/plan enforcement is effectively UI-only; a tenant in READ_ONLY/SUSPENDED or on an expired trial retains full write access via the API. Money is stored as `Float` throughout, and money-mutating writes run as unwrapped multi-step sequences with lost-update races.

Plus one item that needs action today regardless of architecture: **a live Gmail app password is committed in `test-email.js`.**

### Severity tally

| Severity | Count | Headline items |
|---|---|---|
| **Critical** | 8 | Live secret in git; invoice-PDF & invoice-summary disclosure (no authz); unscoped assets GET; plaintext brute-forceable OTP; subscription/feature enforcement is UI-only; trial lockout is dead code |
| **High** | ~20 | 6+ cross-tenant IDOR read/writes; webhook doesn't verify paid amount; public R2 bucket for financial docs; IP-spoofable/multi-instance rate limiting; unhashed bearer tokens; legacy public tenant self-registration; validation/error/pagination libs unused |
| **Medium** | ~25 | Float money; Ticket god-model; no CSP; no soft-delete; cron secret in URL; HTML-injection in emails; weak invoice state machine; UI stack duplication |
| **Low** | ~15 | Doc clutter, dead code trees, password-policy drift, `any` usage |

---

## 1. Critical — fix before anything else

### 1.1 Live Gmail app password committed to git
`test-email.js:8` contains a working 16-character Gmail SMTP **app password** for the real personal account `karumbidzaallen21@gmail.com`, git-tracked. Anyone with repo read access can send mail as that account.
**Action:** revoke the app password in the Google account now, delete the file, and purge it from git history (`git filter-repo` / BFG). `.gitignore` does not cover `test-email.js`, `k.env`, or `USER_CREDENTIALS.md` — fix that too.

### 1.2 Invoice PDF endpoint has no authorization
`app/api/invoices/[id]/summary-pdf/route.ts:11-97` checks only that a Clerk `userId` exists, then `invoice.findUnique({ where: { id } })` with **no role and no tenant check**. Any logged-in user of any role in any tenant can enumerate invoice IDs and download any tenant's full invoice PDF — contractor bank details, customer PII, ticket descriptions. _(Independently flagged by both the auth and tenancy audits.)_
**Action:** load `getAuthContext()`, restrict to admin roles, assert `invoice.tenantId === ctx.tenantId`.

### 1.3 Invoice summary endpoint has no authorization
`app/api/admin/invoices/summary/route.ts:18-108` — `invoice.findUnique({ where: { id: invoiceId || '' } })` with a full include (contractor, ticket, user, asset, ratings, tenant) and **no role or tenant gate**. Same disclosure class as 1.2 via `?invoiceId=`.
**Action:** admin-role gate + `tenantId` filter.

### 1.4 Unscoped asset reads leak the whole table
`app/api/assets/route.ts:19-21` builds `where: { tenantId: tenantId ?? undefined }`. Prisma treats `tenantId: undefined` as *no filter*, so any authenticated principal with a null `tenantId` (a SUPER_ADMIN, or anyone whose Clerk metadata lacks `tenantId`) reads **every asset across all tenants**. There is no role gate on this GET at all. Same `?? undefined` footgun at `app/api/assets/[id]/route.ts:16-24`.
**Action:** fail closed — if `!tenantId`, return 403; never pass `undefined` as a tenant filter.

### 1.5 Password-reset OTPs are plaintext and brute-forceable
`app/api/auth/send-otp/route.ts:52-63` stores a 6-digit OTP as plaintext in `PasswordResetToken.token`; `app/api/auth/reset-password/route.ts:52-70` matches it with `findFirst` and **no per-token attempt counter** (the `otp.maxAttempts: 3` in `security-config.ts:40` is never enforced), no single-active-token constraint, and a 10-minute window. The only throttle is the IP rate limiter — which is itself bypassable (see 3.4). This path rewrites the bcrypt password → full account takeover for any legacy-table account.
**Action:** hash OTPs at rest, enforce single-active-token + max-attempt lockout, and confirm this legacy flow is even reachable given Clerk owns auth.

### 1.6 Subscription & feature enforcement is UI-only
`lib/subscription-guard.ts` (`withSubscriptionGuard`, `subscriptionCheck`) is consumed by exactly one route — `app/api/billing/status/route.ts:35`, and only for `'read'`. **No write route gates on subscription status.** Likewise `components/ui/feature-gate.tsx` only conditionally *renders*; `lib/feature-gating.ts` (`checkTicketLimit`/`checkUserLimit`/`canAccessFeature`) is called only by the check endpoint itself, never by ticket-create or user-create. And `lib/trial-management.ts` (lockout logic) is referenced nowhere outside itself. Net effect: **a tenant in READ_ONLY / GRACE / SUSPENDED, or on an expired trial, or with no subscription at all, retains full write access** via the API, and BASIC tenants can hit PRO/ENTERPRISE-only endpoints directly. The daily cron flips the status field, but nothing enforces that field.
**Action:** enforce entitlement + subscription checks inside the mutating API handlers (or in middleware), not in React.

---

## 2. High — cross-tenant isolation & billing integrity

### 2.1 Cross-tenant IDORs (the "GET forgot what PATCH remembered" class)
The root cause is architectural: isolation is re-implemented per handler, so the safe pattern (`findFirst({ where: { id, tenantId } })`) and the unsafe pattern (`findUnique({ where: { id } })` + inconsistent post-check) coexist in the same files — often the PATCH is guarded and the sibling GET is not.

| Route | Issue |
|---|---|
| `app/api/admin/users/[id]/route.ts:25-42` (GET) | No tenant check; PATCH at :80 has one. Cross-tenant user PII read. |
| `app/api/admin/contractors/[id]/route.ts:26-37` (GET) | No tenant check; PATCH/DELETE have one. Cross-tenant contractor profile. |
| `app/api/admin/contractors/[id]/categories/route.ts:26-34` (GET) | No tenant check; PUT has one. |
| `app/api/admin/contractors/[id]/ratings/route.ts:27-37` | No tenant filter on contractor or ratings. Cross-tenant ratings/rater names. |
| `app/api/tickets/[id]/rating-data/route.ts:11-14` | Auth-only; returns ticket schedule + contractor PII by id. |
| `app/api/admin/tickets/[id]/quote-requests/[quoteRequestId]/route.ts:35-39` | **Write.** Matches quoteRequestId+ticketId but never verifies ticket's tenant → award/reject another tenant's quotes. |
| `app/api/tickets/[id]/status/route.ts:57` | **Write.** Admin branch has no `ticket.tenantId === tenantId` check → close any tenant's ticket. |
| `app/api/tickets/[id]/approve-work/route.ts:27-48` | **Write.** `isAdmin` granted on role alone → approve/reject work on any tenant's ticket. |

**Action:** introduce a shared `requireTenantResource(model, id, ctx.tenantId)` helper and route every tenant-owned lookup through it. This single change closes the whole class and prevents recurrence.

### 2.2 Public/unauthenticated write & disclosure endpoints
- `app/api/quotes/route.ts` — GET (:127) is **completely unauthenticated** and returns all quotes across all tenants (names, emails, phones). POST (:5) is unauthenticated and creates `Tenant` rows from anonymous input (spam/DB pollution).
- `app/api/auth/register-tenant/route.ts` — live **public** self-registration creating Tenant + TENANT_ADMIN + trial Subscription with no rate limit, entirely in the legacy (non-Clerk) system → mass account creation and split-brain identities that can never sign in via Clerk.

### 2.3 Paynow webhook does not verify the paid amount
`app/api/payments/paynow/webhook/route.ts:158-174` activates the subscription on status `paid`/`delivered` without ever comparing the received amount to `payment.amount`; `processSuccessfulPayment` extends the period purely from stored `metadata.advanceMonths`. **A payer completing a smaller/partial transaction still gets the full plan.** Compounded by initiate endpoints trusting a client-supplied `amount` (`billing/paynow/initiate/route.ts:39-83`). Also: the webhook's fallback (`:97-110`) fuzzy-matches "most recent pending payment for the tenant," so a cheap transaction can settle a different larger invoice; and idempotency is race-prone (no unique constraint on `providerPaymentId`, no `SELECT … FOR UPDATE`), allowing double-extension under concurrent delivery.
**Action:** assert `received >= expected` with currency match before activating; match strictly on the embedded reference; add a unique constraint on `providerPaymentId` and lock the row in-transaction; derive amount server-side from plan.

### 2.4 `billing/paynow/verify` is unauthenticated
`app/api/billing/paynow/verify/route.ts:9-57` has no auth; any caller with a (partly guessable) `SUB-{first8ofTenantId}-{ts}` reference gets amount, currency, paidAt, subscription status.

### 2.5 Public R2 bucket for financial documents
`lib/r2-storage.ts:58` returns public URLs; proof-of-payment and invoice PDFs are uploaded to a public bucket with no auth in front, guarded only by a `Math.random()` 6-char suffix. `upload/invoice` and `upload/asset` also only authenticate (no role/tenant check, no ownership check on `ticketId`/`assetId`), and MIME validation trusts the client-supplied `file.type` with no magic-byte check — enabling stored HTML/SVG served from the R2 domain.
**Action:** private bucket + presigned URLs; role/tenant/ownership checks on upload; magic-byte validation.

### 2.6 Unhashed bearer tokens at rest
Invitation, activation, contractor-registration, and KYC password-setup tokens are all stored plaintext (`schema.prisma:215,950`; contractor flows). Single-use is enforced via a `status` column in some paths and not at all in others (contractor-registration submit never flips status).
**Action:** store SHA-256 hashes; enforce atomic single-use via `updateMany where status='pending'`.

### 2.7 Rate limiting is bypassable and multi-instance-broken
`lib/api-rate-limit.ts:29-42` trusts the first `X-Forwarded-For` value with no trusted-proxy validation → an attacker rotates the header for a fresh bucket per request. `lib/rate-limit.ts:17` uses a per-process `Map` unless Redis is explicitly enabled; under PM2 cluster each worker has its own counter. Both fail **open** on error. This directly weakens the OTP path in 1.5.

### 2.8 Validation / error / pagination infrastructure is unused
`lib/validation.ts` (imported by zero routes; ~90 routes destructure `await request.json()` raw — e.g. `admin/tickets/[id]/assign/route.ts:26` accepts a client-supplied `status`), `lib/api-errors.ts` (zero imports; ~104 hand-rolled `console.error` + `NextResponse.json(...500)`), and `lib/pagination.ts` (gated on `ENABLE_PAGINATION` which is only set in `.env.performance`, a file Next never loads → 8 consumer routes return **unbounded** result sets). Error envelopes split between `{error}` (62 files) and `{message}` (21 files); several routes return 401 for authorization failures that should be 403.

---

## 3. Medium

- **Money as `Float` everywhere** (`schema.prisma`: 24 float fields). Balance arithmetic (`admin/invoices/[id]/payment/route.ts:117-119`, `batch-payment`) drifts; `isPaidInFull = balance <= 0` can misfire on cents. Move to `Decimal @db.Decimal(12,2)` or integer minor units.
- **Money writes are not transactional.** `admin/invoices/[id]/payment/route.ts:117-163` is a read-modify-write of `paidAmount`/`balance` with no transaction or optimistic lock → concurrent partial payments lose updates. `tickets/[id]/status`, `admin/tickets/[id]/assign`, `hq-complete`, and contractor invoice-revision flips are similarly multi-write and unwrapped (the last can leave two `isActive:true` invoices per ticket).
- **Ticket god-model.** `Ticket` (`schema.prisma:406-504`) carries ~30 nullable workflow columns; quote fields are duplicated between `Ticket` and `QuoteRequest` (two sources of truth). `lib/ticket-workflow.ts` models the pre-Dec-2025 enum (`ASSIGNED`, old `TicketType`) and is enforced by **no** route — real transition rules are re-implemented ad hoc across ~9 routes, and StatusHistory is written by only some of them.
- **Migration history shows destructive trial-and-error.** Squashed init under a misleading name; a `DROP TABLE locations` + `CREATE TABLE branches` "rename"; an enum whose values were swapped the day the schema was born. Latent data-loss risk if replayed.
- **No CSP** (`next.config.js` sets other headers but no Content-Security-Policy); `SECURITY_HEADERS`/`CORS_CONFIG` in `lib/security-config.ts` are dead code.
- **HTML/SMS injection in notifications.** `lib/email.ts` interpolates user-controlled ticket titles/comments/names into ~15 HTML templates with no escaping; `africastalking-service.ts` similarly. `email.ts:475,638` log plaintext passwords to stdout.
- **Cron secret in URL.** `app/api/cron/subscription-check/route.ts:47-57` compares `?secret=` with `!==` (not constant-time) and the secret travels in the query string (proxy/CDN logs). It does fail closed if unset — good. Move to an `Authorization` header + `timingSafeEqual`.
- **No soft-delete strategy.** Zero `deletedAt`. `onDelete: Cascade` on `Invoice → Ticket` (`schema.prisma:864`) means deleting a ticket destroys its financial records. Tenant has no cascade at all → no offboarding path.
- **Weak invoice state machine.** `admin/invoices/[id]/route.ts:142-154` allows arbitrary status jumps (PENDING→PAID, re-opening PAID); any of six admin roles can mark invoices paid (no finance-role separation). `batch-payment` overwrites `paidAmount` unconditionally, discarding prior partial payments.
- **Missing FK indexes** on `Message.ticketId/userId`, `Attachment.*`, `StatusHistory.ticketId`, `Ticket.assetId/adminId/branchId`, etc. `PasswordResetToken.token` is indexed but **not unique**.
- **UI stack duplication.** MUI 7 + Emotion + Radix/shadcn + Tailwind + framer-motion coexist. MUI is used in 6 files but `MUIThemeProvider` mounts at the root layout (ships Emotion runtime on every page, including marketing/auth); framer-motion powers 2 pages. MUI theme is light-only while Tailwind supports dark mode → guaranteed drift.
- **`super-admin/stats` revenue is fabricated:** `const revenue = activeTenants * 99` ignores actual subscription amounts.

---

## 4. Low / hygiene

- **Split-brain auth.** Clerk is live, but a legacy custom system (bcrypt, activation tokens, OTP reset, tenant self-registration) is still partly wired and writes real password hashes for accounts Clerk never sees. Several readers still use `sessionClaims.publicMetadata` (empty in Clerk v6) instead of `currentUser()` — `lib/subscription-guard.ts:96,129`, `app/admin/users/page.tsx:11`, `route.optimized.ts` — so they silently mis-gate. `getAuthContext` defaults missing role to `END_USER` and the Clerk webhook defaults organic signups to `TENANT_ADMIN`.
- **Client-only page guards** (`auth-guard.tsx`, super-admin page) are bypassable but cosmetic *given* the API is mostly server-checked — except where it isn't (§1–2).
- **Zero tests, zero CI.** No `*.test.*`, no `.github/`. For a payments SaaS this is the biggest process gap. Git log shows a full redesign committed then reverted with nothing gating it.
- **Dead code / risky scripts.** `app/api/admin/tickets/route.optimized.ts` (unrouted duplicate that also pulls in the tenant-unsafe cache layer), `app/(tenant)/[subdomain]/` (vestigial — subdomain tenancy is not implemented; `middleware.ts` has no subdomain logic), `app/auth/{login,signin,signup}` redirect shims, `~1,100 lines` of unused Redis/cache/resilience infra, `.env.performance`. `scripts/reset-and-create-demo.js:9-16` runs `deleteMany({})` on every table with no `NODE_ENV` guard — one `DATABASE_URL` slip from wiping prod.
- **Ten client components exceed 1,000 lines** (`contractor/dashboard.tsx` 2,685 / 30 useState; `assets/asset-register.tsx` 2,267 / 43 useState; `admin/ticket-management.tsx` 2,209 / 43 useState). 81 of 108 tsx files are `'use client'`; zero pages fetch data server-side (all via `fetch` in `useEffect` across 171 call sites, no react-query/SWR). App Router is used as a client SPA shell.
- **Config nits.** `next.config.js:12` uses the Next 15 key `serverExternalPackages` on Next 14 (silently ignored, so the AWS SDK is still bundled). No eslint config file despite eslint in devDeps. 108 `: any`/`as any` occurrences. `USER_CREDENTIALS.md` (self-labeled "delete before production") and misnamed `k.env` (actually a prompt spec) tracked in git. 13 root-level `.md` files, 7 of them Paynow debug artifacts. `seed.ts` hardcodes weak passwords (`admin123`/`demo123`) for production-looking emails with no NODE_ENV guard.

---

## 5. Recommended remediation order

**Now (hours):**
1. Revoke + purge the Gmail app password (§1.1); remove `USER_CREDENTIALS.md`; extend `.gitignore`.
2. Add role+tenant gates to the two invoice disclosure routes (§1.2, §1.3) and fix `tenantId ?? undefined` (§1.4).
3. Guard/remove `scripts/reset-and-create-demo.js` and siblings.

**This week:**
4. Build `requireTenantResource(model, id, ctx.tenantId)` and route the §2.1 IDORs (and every tenant-owned lookup) through it.
5. Enforce subscription/feature checks in mutating handlers (§1.6); hash OTPs + add attempt lockout (§1.5); authenticate `quotes` and `paynow/verify` and kill/gate `register-tenant` (§2.2, §2.4).
6. Verify Paynow amount in the webhook + add `providerPaymentId` uniqueness + row lock (§2.3).

**This month:**
7. Move uploads to a private bucket with presigned URLs + magic-byte validation (§2.5); fix rate-limit IP trust + move to Redis (§2.7).
8. Migrate money to `Decimal`; wrap money writes in `$transaction` with optimistic locks (§3).
9. Wire in (or delete) the unused validation/error/pagination/cache/trial libraries — pick one path per concern (§2.8, §4).
10. Add CI (typecheck + lint + build) and a first test harness around the billing and authorization paths.

**Ongoing / larger:**
11. Decide Clerk-vs-legacy auth and remove the loser; unify metadata reads on `currentUser()`, fail closed on missing role.
12. Extract a real ticket state machine and enforce it; split the Ticket god-model's workflow clusters into child tables.
13. Consolidate the UI stack (Radix/Tailwind; replace `x-data-grid`, drop MUI/Emotion/framer-motion); adopt a data-fetching layer and decompose the 1,000+ line client components.

---

_Audit method: six parallel deep-dive passes (auth/authz, tenancy, data model/API, billing, security, frontend/ops) reading the source directly. Findings that were reported independently by more than one pass (e.g. the invoice-PDF disclosure, the dead `route.optimized.ts`, subscription enforcement gaps) are noted as cross-confirmed. Line numbers reference the state of the `claude/architecture-audit-nstswy` branch at audit time._
