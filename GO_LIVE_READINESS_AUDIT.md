# TickTrack-Pro — Go-Live Readiness Audit

**Audience:** enterprise security questionnaire / third-party pen-test, acquisition due-diligence, and the engineering team's fix backlog.
**Method:** source read of the live code paths (not documentation). Every finding cites `path:line`. Controls are only credited where the **call site that invokes them on the live path** is shown. "Built but never wired in" is treated as a High/Critical finding, because the protection is imaginary.
**Branch audited:** `claude/architecture-audit-nstswy` (line numbers are as of this commit).

---

## 0. Context & assumptions

The brief's context block was left blank. Assumptions made (each would change specific findings if wrong — confirm before sign-off):

| Field | Assumption | How to confirm |
|---|---|---|
| App type | Multi-tenant helpdesk + asset/ticket SaaS with subscription billing and contractor invoicing | README.md:1-8 |
| Stack | Next.js 14.2 App Router, Prisma 5.7, PostgreSQL, TypeScript strict | package.json:27,54; tsconfig.json |
| Tenancy | Shared-DB, shared-schema, row-level `tenantId` | schema.prisma (every tenant model carries `tenantId`) |
| Auth | **Both** Clerk (live) and a legacy custom system (bcrypt/OTP) — flagged as a finding (§I-1) | middleware.ts:16; app/api/auth/* |
| Payments | Paynow (Zimbabwe mobile-money + card). Money-critical. | lib/paynow-service.ts |
| File storage | Cloudflare R2, **public bucket** | lib/r2-storage.ts:58 |
| Notifications | Email (nodemailer/Resend), SMS (Africa's Talking; Twilio present but unused) | lib/email.ts, lib/africastalking-service.ts |
| Hosting | Single VPS + nginx + PM2 (cluster-capable) — **matters for rate-limit/cache correctness** | deployment/DEPLOYMENT_GUIDE.md |
| Environments | Isolation **unverified** — no staging config found | ASSUMPTION — confirm with ops |
| Traffic/growth | Unknown | ASSUMPTION — SLOs in §Load-test are placeholders |
| Data sensitivity | PII (names, emails, phones), financial (invoices, bank refs, payments) | schema.prisma |
| Compliance | Assumed **none formal today, SOC 2 / GDPR-style soon** given enterprise framing | ASSUMPTION |
| Go-live | Unknown date; assumed "no full rewrite" appetite | ASSUMPTION |

**Coverage statement.** Fully read for this pass: `middleware.ts`, `lib/auth.ts`, `lib/subscription-guard.ts`, the payment webhook, OTP send/reset, `quotes`, `paynow/verify`, `assets`, `admin/users/[id]`, `admin/invoices/summary`, `invoices/[id]/summary-pdf`, rate-limit libs, `next.config.js`, upload routes, and `schema.prisma` (models + Payment/PasswordResetToken). Sampled (relayed from a parallel structured pass and spot-verified): the remaining ~90 API routes, the 60 components, migration history, email templates. Commands to complete the sweep are in §Appendix A.

---

## 1. Executive summary

- **The app is not go-live ready for an enterprise buyer today: there are open unauthenticated/under-authorized data-disclosure bugs and a UI-only billing enforcement model.** Both are automatic pen-test blockers.
- **Root cause #1 — authorization is hand-rolled per route, so it is applied inconsistently.** There is no single "load this tenant's resource safely" primitive. The result is a *class* of broken-object-level-authorization bugs: sibling handlers in the same file where PATCH checks the tenant and GET does not, plus two invoice endpoints with no tenant/role check at all. A skeptical reviewer should read this as systemic, not incidental.
- **Root cause #2 — the security/reliability controls exist as code but are not on the request path.** The subscription guard, feature-gating, trial lockout, centralized validation, error handling, pagination, Redis, and the cache layer are all written and then imported by essentially zero live routes. Everyone believes these protections exist; they do not run. This is the most dangerous property of the codebase because it produces false confidence.
- **Revenue integrity is not enforced server-side.** A tenant that is READ_ONLY, SUSPENDED, on an expired trial, or on a cheaper plan can perform paid actions via the API by skipping the React layer. The Paynow webhook never checks the amount paid against the amount owed, so an underpayment activates the full plan.
- **A live Gmail app password is committed to git** (`test-email.js`) and present in history — rotate today.
- **Money is stored as `Float` throughout and money-mutating writes are not transactional**, so invoice balances will drift on cents and lose updates under concurrent payment.
- **Process maturity is a blocker on its own: zero automated tests, no CI, no branch protection** on a payments SaaS. A full UI redesign was merged and reverted in-branch with nothing gating it (commits `f0fb881`→`6888c63`).
- **Operational controls that pen-testers check are absent or dead:** no CSP, rate limiting trusts a spoofable `X-Forwarded-For` and fails open, and (under PM2 cluster without Redis) counts per-worker.
- **The good news, stated fairly:** ~85% of routes *do* re-check role and tenant server-side; the Paynow webhook *does* verify its hash; there is a real health endpoint; TypeScript strict mode is on; and the fixes are mostly wiring + a shared helper, not a rewrite. The structural problems are correctable in weeks, not quarters.

---

## 2. Severity tally

| Severity | Count | Headline items |
|---|---|---|
| **Critical** | 8 | Live secret in git (E-1); invoice-PDF disclosure, no authz (A-1); invoice-summary disclosure, no authz (A-2); unscoped `assets` GET via `tenantId ?? undefined` (A-3); UI-only subscription/quota enforcement (C-1); trial lockout is dead code (C-2); plaintext brute-forceable OTP (F-1); prod-wipe script with no guard (E-2) |
| **High** | 12 | Cross-tenant IDOR class, ≥8 routes (A-4…A-11); unauth `quotes` GET + anonymous tenant creation (A-12); unauth `paynow/verify` state leak (A-13); webhook doesn't verify paid amount (D-1); webhook fuzzy-fallback settles wrong invoice (D-2); public R2 bucket for financial docs (G-3); rate-limit XFF spoof + fail-open + per-worker (H-1); unhashed bearer tokens (F-2); legacy public tenant self-registration (I-1); 51/61 mutating routes unvalidated (G-1); validation/error/pagination libs unused (I-2) |
| **Medium** | 14 | Float money (D-3); non-transactional money writes (D-4); no CSP (§3); illegal invoice state jumps + no finance-role separation (D-5); Ticket god-model (J/model); HTML injection in emails (G-2); cron secret in URL (A-14); no soft-delete + cascade destroys invoices (J-1); missing FK indexes (perf); email enumeration (F-3); `super-admin` revenue fabricated (obs); upload MIME trust (G-3); no CI/tests (§3); dead `route.optimized.ts` pulls unsafe cache (I-3) |
| **Low** | ~10 | Doc/secret-file clutter, `next.config.js` wrong key, password-policy drift, 108 `any`, subdomain vestige, redirect shims |

**Reconciliation with the earlier audit (verify-don't-trust):** all major prior findings **CONFIRMED** against current code, with one **FALSE-POSITIVE correction** — `Payment.providerPaymentId` **is** `@unique` (schema.prisma ~355), so the DB *does* enforce single-settlement per provider reference. The residual webhook risk is therefore the fuzzy-fallback match (D-2) and the missing amount check (D-1), not a missing constraint.

---

## 3. Risk register

| ID | Sev | Area | Evidence (path:line) | Impact | Fix approach | Effort | Wired-in? |
|---|---|---|---|---|---|---|---|
| E-1 | Crit | Secrets | test-email.js:8; in history `683a17d` | Live Gmail app password → send-as, phishing | Revoke, delete, purge history, gitignore | S | — |
| A-1 | Crit | AuthZ | app/api/invoices/[id]/summary-pdf/route.ts:11-18 | Any user downloads any tenant's invoice PDF (PII, bank) | Add authctx + role + `tenantId` check | S | N |
| A-2 | Crit | AuthZ | app/api/admin/invoices/summary/route.ts:18 | Any user reads any invoice via `?invoiceId=` | Add role gate + `tenantId` filter | S | N |
| A-3 | Crit | Tenancy | app/api/assets/route.ts:19-21; [id]/route.ts:16 | `tenantId ?? undefined` → whole-table read for null-tenant principals | Fail closed on null tenant | S | Partial |
| C-1 | Crit | Billing | lib/subscription-guard.ts (1 call site: billing/status:35); lib/feature-gating.ts (only features/check) | READ_ONLY/SUSPENDED/expired tenants keep write access; plan limits unenforced | Wire guard into mutating handlers/middleware | L | N |
| C-2 | Crit | Billing | lib/trial-management.ts (0 call sites) | Trial lockout never runs | Wire in or delete | M | N |
| F-1 | Crit | Tokens | send-otp:49-63; reset-password:54-70 | 6-digit plaintext OTP, no attempt lockout → account takeover | Hash OTP, add attempt counter + single-active | M | N/A |
| E-2 | Crit | Scripts | scripts/reset-and-create-demo.js:6-20 | `deleteMany({})` all tables, no env guard → prod wipe | NODE_ENV guard + explicit confirm | S | — |
| A-4…A-11 | High | Tenancy | admin/users/[id]:25; admin/contractors/[id]:26; …/categories:26; …/ratings:27; tickets/[id]/rating-data:11; admin/tickets/[id]/quote-requests/[qrid]:35; tickets/[id]/status:57; tickets/[id]/approve-work:27 | Cross-tenant read & **write** IDOR class | Shared `requireTenantResource` + route all lookups | L | N |
| A-12 | High | AuthZ | app/api/quotes/route.ts:5,131 | Unauth GET dumps all tenants' quotes; unauth POST creates Tenant rows | Auth GET; rate-limit/captcha POST; don't persist Tenant | M | N |
| A-13 | High | Billing | app/api/billing/paynow/verify/route.ts:9-56 | Unauth payment/subscription state leak by reference | Require auth + tenant scope | S | N |
| D-1 | High | Money | payments/paynow/webhook/route.ts:158-166 | Underpayment activates full plan | Verify amount+currency vs expected before activate | M | N |
| D-2 | High | Money | payments/paynow/webhook/route.ts:98-110 | Cheap tx settles a different larger pending invoice | Match strictly on embedded reference | M | Partial |
| G-3 | High | Uploads | lib/r2-storage.ts:58; upload/invoice:15; upload/asset:15 | Public bucket serves financial PDFs; no role/magic-byte check | Private bucket + presigned + role + magic bytes | L | Partial |
| H-1 | High | Rate limit | api-rate-limit.ts:33,90; rate-limit.ts:17 | XFF spoof → fresh bucket; fail-open; per-worker | Trusted-proxy IP + shared store + fail-closed on auth | M | Partial |
| F-2 | High | Tokens | schema.prisma:260 (token not unique); invitation/activation tokens plaintext | Token DB read → account takeover | SHA-256 at rest + atomic single-use | M | N |
| I-1 | High | Auth | app/api/auth/register-tenant/route.ts | Public unrated tenant/admin creation; split-brain vs Clerk | Remove or gate behind Clerk+onboarding | M | — |
| G-1 | High | Validation | 51 of 61 mutating routes parse `request.json()` raw | Mass-assignment, illegal `status`/`amount`/`role` | Zod at every handler; reject unknown keys | L | N |
| I-2 | High | Dead ctrl | lib/{validation,api-errors,pagination}.ts imported only by dead route.optimized.ts | Believed-present controls don't run; unbounded lists | Wire in or delete; pick one per concern | M | N |
| D-3 | Med | Money | schema.prisma (24 Float fields) | Cent drift, wrong `balance<=0` | Decimal(12,2) or minor units | L | — |
| D-4 | Med | Money | admin/invoices/[id]/payment/route.ts:117-163 | Lost-update on concurrent payment | `$transaction` + optimistic version | M | N |
| D-5 | Med | Money | admin/invoices/[id]/route.ts:142-154 | PENDING→PAID jump; any admin marks paid | State-machine + finance role | M | N |
| A-14 | Med | Cron | app/api/cron/subscription-check/route.ts:47 | Secret in URL, non-constant-time compare | Header + timingSafeEqual | S | Y(weak) |
| J-1 | Med | Lifecycle | schema.prisma:864 (Invoice→Ticket Cascade) | Deleting ticket destroys invoices; no tenant offboarding | Restrict/soft-delete | M | — |
| G-2 | Med | XSS | lib/email.ts (~15 templates interpolate user text) | HTML injection in notification emails | Escape interpolated values | M | N |
| SEC-CSP | Med | Headers | next.config.js:20-63 (no CSP) | No script-injection defense-in-depth | Add CSP + frame-ancestors | M | N |
| P-1 | Med | Process | no `.github/`, no test runner, no `test` script | No safety net on payments SaaS | CI + tests on auth/tenancy/billing | L | — |

---

## 4. Full findings by failure-mode taxonomy

### A. Authorization that slips

**A-1 (Critical) — `invoices/[id]/summary-pdf` authenticates but never authorizes.**
`app/api/invoices/[id]/summary-pdf/route.ts:11-18`: it takes `auth()`, checks only that `clerkUserId` exists, then `prisma.invoice.findUnique({ where: { id: invoiceId } })` including ticket, reporter (name/email/phone), assignee contractor, branch. **No role check, no `tenantId` check.** Any authenticated user of any tenant/role downloads any tenant's full invoice PDF by iterating IDs. *Wired-in control: none.*

**A-2 (Critical) — `admin/invoices/summary` same class.**
`app/api/admin/invoices/summary/route.ts:18-35`: `getAuthContext()` is called but the returned `role`/`tenantId` are **never used to gate**; `findUnique({ where: { id: invoiceId || '' } })` with a full include (contractor, ticket, user, asset, ratings, tenant) returns any invoice via `?invoiceId=`.

**A-3 (Critical) — the undefined-tenant footgun.**
`app/api/assets/route.ts:19-21` builds `where: { tenantId: tenantId ?? undefined }`. Prisma drops `undefined` predicates, so when `tenantId` is null (any SUPER_ADMIN, or any principal whose Clerk metadata lacks `tenantId` — which `lib/auth.ts:43` can produce silently) this returns **every asset in every tenant**, and the GET has **no role gate at all**. Same pattern at `app/api/assets/[id]/route.ts:16`. This is the canonical fail-open tenancy bug; fix by failing closed.

**A-4…A-11 (High) — the IDOR class: "GET forgot what PATCH remembered."** Same-file sibling handlers where the mutation checks tenant and the read does not:

| Route:line | Verb | Gap |
|---|---|---|
| admin/users/[id]/route.ts:25 | GET | `findUnique({id})`; PATCH (:~80) checks `user.tenantId!==tenantId`, GET does not |
| admin/contractors/[id]/route.ts:26 | GET | no tenant check; PATCH/DELETE have one |
| admin/contractors/[id]/categories/route.ts:26 | GET | no tenant check; PUT has one |
| admin/contractors/[id]/ratings/route.ts:27 | GET | no tenant filter on contractor or ratings |
| tickets/[id]/rating-data/route.ts:11 | GET | auth-only; returns contractor PII |
| admin/tickets/[id]/quote-requests/[quoteRequestId]/route.ts:35 | **POST** | matches qrid+ticketId, never verifies ticket's tenant → award/reject another tenant's quotes |
| tickets/[id]/status/route.ts:57 | **PATCH** | admin branch lacks `ticket.tenantId===tenantId` → close any tenant's ticket |
| tickets/[id]/approve-work/route.ts:27 | **POST** | `isAdmin` on role alone → approve work on any tenant's ticket |

Systemic root cause: no shared resource loader; each handler re-implements the check and some omit it. Fix = one helper, §Phase 1.

**A-12 (High) — `quotes` is fully public.** `app/api/quotes/route.ts:131-158` GET has **no auth** and returns all quotes across all tenants with tenant name/email/phone. POST (:5-67) has no auth and **creates `Tenant` rows** from anonymous input (`prisma.tenant.create`, :53) → DB pollution / enumeration / spam.

**A-13 (High) — `paynow/verify` unauth state leak.** `app/api/billing/paynow/verify/route.ts:9-56` — no auth; a caller with a `reference` (`SUB-{first8ofTenantId}-{ts}`, partially guessable) receives `amount`, `currency`, `paidAt`, `subscriptionStatus`.

**A-14 (Medium) — cron secret in URL.** `app/api/cron/subscription-check/route.ts:47` compares `?secret=` with `!==` (not constant-time); secret lands in proxy/CDN/access logs. It does fail closed when unset (good). Move to `Authorization` header + `crypto.timingSafeEqual`.

**Privilege defaulting (Medium).** `lib/auth.ts:37` defaults a missing role to `END_USER` (safe direction), but the Clerk webhook defaults organic signups to `TENANT_ADMIN` (`app/api/webhooks/clerk/route.ts:42`, relayed) — a permissive default. And `lib/subscription-guard.ts:96,129` reads role from `sessionClaims.publicMetadata`, which git history shows is empty under Clerk v6 → any wired use would read `END_USER`/null and mis-gate. Confirm and switch to `getAuthContext()`.

**Client-only guards (Medium, mostly cosmetic).** `components/auth/auth-guard.tsx` + page-level `useUser()` redirects gate navigation only; acceptable *because* the API mostly re-checks — except where it doesn't (A-1…A-13).

### B. Multi-tenant isolation

There is **no** single enforced way to load a tenant-owned resource; the safe idiom `findFirst({ where: { id, tenantId } })` and the unsafe `findUnique({ where: { id } })` coexist across the codebase. Recommendation: introduce `requireTenantResource(model, id, ctx.tenantId)` (Phase 1 diff) and, longer term, evaluate Postgres Row-Level Security as defense-in-depth. Cache keys: `lib/cache-middleware.ts::generateCacheKey` omits `tenantId` (would poison across tenants) but is only referenced by the dead `route.optimized.ts`, so it is dormant — **do not promote that file** until the key includes tenant scope. Subdomain tenancy (`app/(tenant)/[subdomain]/`) is vestigial: `middleware.ts` has no host/subdomain logic; delete to avoid future code trusting the URL.

### C. Enforcement that's UI-only

**C-1 (Critical).** `lib/subscription-guard.ts` exposes `withSubscriptionGuard`/`subscriptionCheck`. Grep for call sites: the **only** consumer is `app/api/billing/status/route.ts:35`, and only for `'read'`. No mutating route wraps a handler. `lib/feature-gating.ts` (`checkTicketLimit`/`checkUserLimit`/`canAccessFeature`) is called **only** by `app/api/features/check/route.ts` (the check endpoint itself). `components/ui/feature-gate.tsx` only conditionally renders. Net: quotas (`maxUsers`, `maxTicketsPerMonth`) and tier gates are **not enforced on write** — `curl` bypasses billing.

**C-2 (Critical).** `lib/trial-management.ts` (`lockTenantAccount`, `getExpiredTrials`, …) has **zero** call sites anywhere (`grep -rn trial-management app lib components` → empty). Trial expiry never locks anything. The daily cron flips `Subscription.status`, but because of C-1 nothing enforces that status on writes.

### D. Money & payment integrity

**D-1 (High).** `app/api/payments/paynow/webhook/route.ts:158-166`: on `paid`/`delivered` it calls `BillingService.processSuccessfulPayment(payment.id, …)` and extends the plan from stored metadata — it **never compares `processedData.amount` to the expected plan price**. Underpayment/partial mobile-money still unlocks the full period. The hash *is* verified (`lib/paynow-service.ts` via `verifyHash`) so callbacks aren't forgeable, but authenticity ≠ correct amount.

**D-2 (High).** `webhook/route.ts:98-110`: when no payment matches by `providerPaymentId` or stored `hash`, it grabs the **most recent pending PAYNOW payment for the tenant** and settles it. Combined with D-1, a cheap transaction can close a different, larger pending invoice. Match strictly on the reference embedded in the Paynow reference string instead.

**D-3 (Medium).** 24 `Float` money fields (`schema.prisma`: `Payment.amount`:344, `Invoice.amount/paidAmount/balance`:822-853, `Subscription.amount`:316, etc.). `admin/invoices/[id]/payment/route.ts:117-119` does `newBalance = amount - (paidAmount + amount)`; `isPaidInFull = newBalance <= 0` misfires on binary-float cents.

**D-4 (Medium).** `admin/invoices/[id]/payment/route.ts:77→117-163` is a read-modify-write of `paidAmount`/`balance` with **no transaction and no optimistic lock** → concurrent partial payments lose updates. Same unwrapped multi-write shape in `tickets/[id]/status`, `admin/tickets/[id]/assign`, `hq-complete`, and contractor invoice-revision flips (the last can leave two `isActive:true` invoices per ticket, breaking the `take:1` "active invoice" assumption).

**D-5 (Medium).** `admin/invoices/[id]/route.ts:142-154` permits arbitrary status jumps (PENDING→PAID, re-opening PAID); any of six admin roles can mark invoices paid (no finance-role separation). `batch-payment` overwrites `paidAmount=amount` unconditionally, discarding prior partial payments.

### E. Secrets & credential hygiene

**E-1 (Critical).** `test-email.js:8` — working Gmail SMTP **app password** for `karumbidzaallen21@gmail.com`, committed. `git log --all -- test-email.js` → present since `683a17d`; still tracked at HEAD. `.gitignore` does not cover it, `k.env`, or `USER_CREDENTIALS.md` (all three tracked, confirmed via `git ls-files`). **Rotate the app password now**, delete the files, purge history.

**E-2 (Critical).** `scripts/reset-and-create-demo.js:6-20` runs `deleteMany({})` on every table with **no NODE_ENV guard** — one `DATABASE_URL` mistake wipes prod. Siblings (`clean-ticket-data.js`, `cleanup-test-data.js`) same class.

**E-3 (Medium).** `prisma/seed.ts` hardcodes `admin123`/`demo123`/`user123`/`contractor123` for production-looking emails with no env guard.

### F. Tokens & auth secrets at rest

**F-1 (Critical).** `app/api/auth/send-otp/route.ts:49-63` stores a 6-digit OTP as **plaintext** in `PasswordResetToken.token`; `reset-password/route.ts:54-70` looks it up with `findFirst` and **no per-token attempt counter** (the `otp.maxAttempts:3` in `security-config.ts:40` is never referenced). It deletes tokens on *success* (:85-94) but not on failed guesses, so within the 10-min window an attacker throttled only by the (spoofable, fail-open — see H-1) IP limiter can brute the 10⁶ space. This path rewrites the bcrypt password → full account takeover of any legacy-table account.

**F-2 (High).** Invitation/activation/contractor/KYC tokens are stored plaintext; `PasswordResetToken.token` is indexed but **not `@unique`** (`schema.prisma:260,271`). DB read = account takeover; multiple valid tokens can coexist.

**F-3 (Medium).** `reset-password/route.ts:46-51` returns explicit `404 "User not found"` → email enumeration (while `send-otp`/`forgot-password` correctly return generic responses — inconsistent).

### G. Input validation & output encoding

**G-1 (High).** 51 of 61 route files that call `await request.json()` do so with **no schema** (`grep` in §Appendix A). Examples: `admin/tickets/[id]/assign/route.ts:26` accepts a client-supplied `status`; asset/invoice creates spread client data. Client-controlled `status`, `amount`, `role`, `tenantId`, `price` are trust-sensitive. Adopt Zod at every mutating handler and reject unknown keys.

**G-2 (Medium).** `lib/email.ts` interpolates user-controlled ticket titles/comments/names into ~15 HTML templates with no escaping (e.g. rating `comments`); `africastalking-service.ts` similarly for SMS. HTML injection / phishing in notifications. `email.ts:475,638` also log plaintext passwords to stdout.

**G-3 (High).** Uploads: `lib/r2-storage.ts:58` returns public URLs; POP/invoice PDFs live in a **public** bucket behind only a `Math.random()` 6-char suffix. `upload/invoice/route.ts:15` and `upload/asset/route.ts:15` destructure `role` but apply **no role/tenant/ownership check** (only `upload/pop` restricts to admins). MIME is validated from the client-supplied `file.type` with **no magic-byte check**, so stored HTML/SVG can be served from the user-content domain.

### H. Rate limiting & abuse

**H-1 (High).** `lib/api-rate-limit.ts:29-33` — `getClientIp` returns the first `X-Forwarded-For` value with **no trusted-proxy hop config**; an attacker rotates the header for a fresh bucket per request. It **fails open** on error (`:90` "allow the request (fail open)", `:171-174` `return null // Fail open`). `lib/rate-limit.ts:17` uses a per-process `Map` unless `ENABLE_REDIS_CACHE` is set and Redis is up (`:82-84`), so under PM2 cluster the effective limit is × worker-count. Auth/OTP paths depend on this limiter (F-1), so its weakness is load-bearing.

### I. Dead / duplicate / drifting code

**I-1 (High).** Two auth systems coexist: Clerk (live) and a legacy custom stack (bcrypt, `activationToken`, OTP reset, `register-tenant`) that still writes real password hashes for accounts Clerk never sees (split-brain). `app/api/auth/register-tenant/route.ts` is a public, unrated tenant+admin creation path.

**I-2 (High).** `lib/validation.ts`, `lib/api-errors.ts`, `lib/pagination.ts` are imported **only** by the dead `app/api/admin/tickets/route.optimized.ts` (`grep` confirms). So centralized validation/error-handling are 0% live, and `lib/pagination.ts` is gated on `ENABLE_PAGINATION` (set only in `.env.performance`, a file Next never loads) → its consumer routes return **unbounded** result sets.

**I-3 (Medium).** `route.optimized.ts` is an unrouted duplicate (Next serves only `route.ts`) that also drags in the tenant-unsafe cache middleware and a stale `sessionClaims` auth path. Delete. ~1,100 lines of Redis/cache/resilience infra are imported nowhere live.

**I-4 (Low).** Migration history shows destructive trial-and-error: `DROP TABLE locations`+`CREATE TABLE branches` "rename" (`20251210030122_...`), an enum whose values were swapped the day the schema was born (`20251206224618_add_ticket_types`). Latent data-loss risk if ever replayed forward on populated data.

### J. Data protection & lifecycle

**J-1 (Medium).** No `deletedAt` anywhere (no soft-delete). `Invoice → Ticket` is `onDelete: Cascade` (`schema.prisma:864`) → deleting a ticket destroys its financial records. `Tenant` has no cascade → tenant deletion throws FK errors, so there is **no clean offboarding / GDPR-erasure path**. PII/secret leakage into logs (G-2, `email.ts:475`). Encryption in transit is handled by nginx TLS (deployment) with HSTS set in `next.config.js:53`; at-rest encryption for DB/bucket/backups is **unverified** (ASSUMPTION — confirm with ops).

---

## 5. Production-readiness sweep (gaps + evidence)

- **Secure headers:** `next.config.js:20-63` sets X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, HSTS, Cache-Control. **No CSP and no `frame-ancestors`.** `lib/security-config.ts` `SECURITY_HEADERS`/`CORS_CONFIG` are dead (imported nowhere). Add CSP (Medium).
- **CORS:** no explicit allowlist enforced; relies on same-origin. Acceptable if no cross-origin browser clients — confirm before exposing a public API.
- **CSRF:** Clerk uses cookies; mutations are same-origin `fetch` with Clerk session. Confirm Clerk's CSRF posture is relied upon and no cookie-auth custom route accepts cross-site POST.
- **Dependencies:** `package-lock.json` committed (good). No SCA in CI (none exists). `twilio` is an unused dependency (attack surface). Run `npm audit` and triage (Appendix A).
- **Performance:** client-SPA misuse — 81/108 tsx are `'use client'`, zero pages fetch server-side, ~171 `fetch` in `useEffect`, no react-query/SWR. Unbounded lists via disabled pagination (I-2). `admin/stats` loads all completed tickets into memory to average resolution time. Missing FK indexes (Messages, Attachments, StatusHistory, several Ticket FKs). Ten client components >1,000 lines.
- **Caching:** in-memory only, tenant-unsafe key in the dead middleware; no CDN cache strategy documented.
- **Concurrency & resilience:** `lib/resilience.ts` (timeout/retry) is used only by `lib/db-utils.ts`; no outbound timeouts on Paynow/SMS/email calls in the routes; no circuit breakers. DB pool vs PM2 worker count not tuned (risk of exhausting Postgres `max_connections`).
- **Reliability/ops:** real `/api/health` (DB+Redis+memory) — good, public for LB. Metrics are in-process only (reset on restart). Migration strategy mixes `db:push` and `migrate` (drift risk). **No documented tested restore drill (RTO/RPO), no rollback rehearsal, no feature flags.**
- **CI/CD:** **none** (`.github/` absent). No typecheck/lint/test/build/SCA gate, no branch protection.
- **Tests:** **zero.** No runner, no `test` script. Auth/tenancy/billing are untested. Top-tier process finding.
- **Observability:** two logger implementations plus 227 raw `console.*`; not structured JSON; no correlation/tenant IDs in logs; no tracing; no audit log for payments/role-changes/exports/deletes.

---

## 6. Threat model (STRIDE, by trust boundary)

| Boundary | Threat (STRIDE) | Current control (evidence it's wired in) | Gap | Mitigation |
|---|---|---|---|---|
| Browser ↔ API | **S/E** impersonation, priv-esc | Clerk session in `middleware.ts:16-23`; ~85% routes re-check role/tenant via `getAuthContext` | A-1…A-13 routes skip authz; role default paths | Shared authz helper; middleware role gate |
| **Tenant ↔ Tenant** (the one buyers care about) | **I/T** cross-tenant read/write | Per-route `findFirst({id,tenantId})` where present | Inconsistent; `tenantId ?? undefined` fails open (A-3); IDOR class (A-4…A-11) | `requireTenantResource`; fail-closed null tenant; RLS as depth |
| API ↔ DB | **T/R** lost updates, injection | Prisma parameterized queries; `$queryRaw` only constant `SELECT 1` | Non-transactional money writes (D-4); Float drift (D-3) | `$transaction` + optimistic lock; Decimal |
| API ↔ Paynow webhook | **S/T** forged/replayed/underpaid callback | `verifyHash` in `paynow-service`; `providerPaymentId @unique`; idempotency status check | No amount check (D-1); fuzzy fallback (D-2) | Verify amount+currency; strict reference match |
| API ↔ R2 storage | **I** unauthorized doc read; **T** malicious upload | Filename sanitization; size limits | Public bucket (G-3); no magic-byte; no role check | Private bucket + presigned; content sniff; role gate |
| Cron ↔ API | **S** unauthorized trigger | Shared secret (`cron/subscription-check:47`), fail-closed if unset | Secret in URL; non-constant compare (A-14) | Header + timingSafeEqual |
| Attacker ↔ Auth | **S/D** OTP brute, enumeration, spam signup | IP rate limit (weak) | Plaintext OTP no lockout (F-1); XFF spoof/fail-open (H-1); public register (I-1) | Hash+lockout OTP; trusted-proxy fail-closed limiter; gate signup |
| Logs/Backups | **I** secret/PII exposure | — | Passwords/PII to stdout (G-2); at-rest encryption unverified (J-1) | Redact logs; confirm encryption |

---

## 7. Enterprise / buyer acceptance bar

| Gate | Status | Note |
|---|---|---|
| Pen-test: no open Critical/High | **Blocker** | 8 Critical, 12 High open (§2) |
| Secrets management | **Gap** | Secret in git; env-only, no vault/KMS, no rotation policy |
| RBAC + least-privilege + audit trail | **Gap** | RBAC exists but no audit log for payments/role-changes/deletes; broad admin role for finance ops |
| Tenant isolation guarantee (contractable) | **Blocker** | Cannot warrant isolation with A-1…A-13 open |
| Data protection (in-transit + at-rest) | **Gap** | TLS+HSTS yes; at-rest encryption + backup encryption unverified |
| Privacy/DSAR (export + erasure) | **Gap** | No soft-delete/erasure path; cascade destroys financial records (J-1) |
| Billing/revenue integrity | **Blocker** | UI-only enforcement (C-1); webhook amount unverified (D-1) |
| SLA/uptime/DR | **Gap** | Health checks yes; no tested restore, single VPS, DB co-located |
| CI/CD + tests | **Blocker** | No CI, zero tests on a payments SaaS |
| Runbooks/on-call/versioning | **Gap** | Deploy guide exists; no on-call/runbook/rollback rehearsal |

**Verdict:** not sellable to a security-conscious enterprise buyer until Phase 0 + Phase 1 close and CI + a first test harness land. None of the blockers require a rewrite.

---

## 8. Phased upgrade plan

**Phase 0 — Ship blockers (hours).** E-1 secret rotation/purge; A-1/A-2 invoice disclosure; A-3 undefined-tenant leak; E-2 prod-wipe guard; A-13 verify endpoint. Exact diffs in §9.
**Phase 1 — This week.** `requireTenantResource` helper + route the IDOR class (A-4…A-11) through it; enforce subscription/entitlement in mutating handlers (C-1) and fix the guard's `sessionClaims` bug; hash OTP + attempt lockout (F-1) and token hashing (F-2); authenticate `quotes` (A-12); verify webhook amount + strict reference (D-1/D-2); remove/gate `register-tenant` (I-1). Diffs in §9.
**Phase 2 — This month.** Private bucket + presigned + magic-byte (G-3); trusted-proxy + shared-store + fail-closed rate limiter (H-1); money → Decimal + transactional writes (D-3/D-4); CSP (§5); wire-in-or-delete dead infra (I-2/I-3); add CI + first tests on auth/tenancy/billing (P-1); Zod on all mutating routes (G-1).
**Phase 3 — Ongoing.** De-dupe Clerk vs legacy auth (I-1); real ticket state machine; split Ticket god-model; Decimal migration completion; UI-stack consolidation; server-side data fetching; RLS evaluation; audit logging + tracing.

---

## 9. Exact diffs — Phase 0 & Phase 1

> All diffs are minimal and reversible. Anything touching **money, auth, or migrations** must be reviewed and preceded by a DB backup. Diffs assume the `@/lib/auth` `getAuthContext()` accessor (the correct, `currentUser()`-based one).

### Phase 0

**P0-1 — Remove the committed secret (E-1).**
```bash
# 1) Rotate FIRST: revoke the Gmail app password in the Google account.
# 2) Remove from the working tree:
git rm test-email.js
# 3) Purge from history (choose one), then force-push a protected branch per policy:
#    pipx run git-filter-repo --path test-email.js --invert-paths
# 4) Ignore the offenders going forward:
```
```diff
--- a/.gitignore
+++ b/.gitignore
@@
 # Misc
 *.log
 *.pid
 *.seed
+
+# Never commit local test/one-off secrets or credential notes
+test-email.js
+k.env
+*.env
+USER_CREDENTIALS.md
```
```bash
git rm --cached k.env USER_CREDENTIALS.md   # stop tracking; keep locally if needed
```

**P0-2 — Authorize the invoice PDF route (A-1).** Full replacement of the guard block at the top of `app/api/invoices/[id]/summary-pdf/route.ts`:
```diff
--- a/app/api/invoices/[id]/summary-pdf/route.ts
+++ b/app/api/invoices/[id]/summary-pdf/route.ts
@@
-import { NextRequest, NextResponse } from 'next/server'
-import { auth } from '@clerk/nextjs/server'
-import { prisma } from '@/lib/prisma'
-import { generateInvoiceSummaryPDF } from '@/lib/pdf-generator'
+import { NextRequest, NextResponse } from 'next/server'
+import { getAuthContext } from '@/lib/auth'
+import { prisma } from '@/lib/prisma'
+import { generateInvoiceSummaryPDF } from '@/lib/pdf-generator'
+
+const ADMIN_ROLES = ['TENANT_ADMIN','IT_ADMIN','SALES_ADMIN','RETAIL_ADMIN','MAINTENANCE_ADMIN','PROJECTS_ADMIN']
@@
-  try {
-    const { userId: clerkUserId } = await auth()
-    if (!clerkUserId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
-
-    const invoiceId = params.id
-
-    // Fetch invoice with all related data
-    const invoice = await prisma.invoice.findUnique({
-      where: { id: invoiceId },
+  try {
+    const ctx = await getAuthContext()
+    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
+    const isAdmin = ADMIN_ROLES.includes(ctx.role)
+    const isContractor = ctx.role === 'CONTRACTOR'
+    if (!isAdmin && !isContractor && !ctx.isSuperAdmin) {
+      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
+    }
+
+    const invoiceId = params.id
+
+    // Fail-closed tenant scope: SUPER_ADMIN may cross tenants; everyone else is pinned.
+    const tenantScope = ctx.isSuperAdmin ? {} : { tenantId: ctx.tenantId ?? '__none__' }
+
+    const invoice = await prisma.invoice.findFirst({
+      where: { id: invoiceId, ...tenantScope, ...(isContractor ? { contractorId: ctx.userId } : {}) },
       include: {
         ticket: {
           include: {
```
_(Note: `findUnique` → `findFirst` because we now add non-`@id` predicates. `__none__` guarantees no match when `tenantId` is null.)_

**P0-3 — Authorize the invoice summary route (A-2).**
```diff
--- a/app/api/admin/invoices/summary/route.ts
+++ b/app/api/admin/invoices/summary/route.ts
@@
-    const { userId, tenantId, role } = authCtx
+    const { userId, tenantId, role, isSuperAdmin } = authCtx
+    const ADMIN_ROLES = ['TENANT_ADMIN','IT_ADMIN','SALES_ADMIN','RETAIL_ADMIN','MAINTENANCE_ADMIN','PROJECTS_ADMIN']
+    if (!isSuperAdmin && !ADMIN_ROLES.includes(role)) {
+      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
+    }
@@
-    const invoice = await prisma.invoice.findUnique({
-      where: { id: invoiceId || '' },
+    const tenantScope = isSuperAdmin ? {} : { tenantId: tenantId ?? '__none__' }
+    const invoice = await prisma.invoice.findFirst({
+      where: { id: invoiceId || '', ...tenantScope },
```

**P0-4 — Fail closed on null tenant for assets (A-3).**
```diff
--- a/app/api/assets/route.ts
+++ b/app/api/assets/route.ts
@@
-    const { userId, tenantId, role } = authCtx
+    const { userId, tenantId, role, isSuperAdmin } = authCtx
+    // Fail closed: a null tenant must never collapse to "no filter".
+    if (!tenantId && !isSuperAdmin) {
+      return NextResponse.json({ error: 'No organisation context' }, { status: 403 })
+    }
@@
-    const whereClause = {
-      tenantId: tenantId ?? undefined
-    }
+    const whereClause = isSuperAdmin && !tenantId ? {} : { tenantId: tenantId as string }
```
Apply the identical `!tenantId` guard at `app/api/assets/[id]/route.ts:16`.

**P0-5 — Guard the destructive script (E-2).**
```diff
--- a/scripts/reset-and-create-demo.js
+++ b/scripts/reset-and-create-demo.js
@@
 const { PrismaClient } = require('@prisma/client');
 const bcrypt = require('bcryptjs');
 const prisma = new PrismaClient();
 
 async function main() {
+  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DB_RESET !== 'yes') {
+    console.error('Refusing to run: set NODE_ENV!=production and ALLOW_DB_RESET=yes to proceed.');
+    console.error('Target DB:', (process.env.DATABASE_URL || '').replace(/:\/\/.*@/, '://***@'));
+    process.exit(1);
+  }
   console.log('🗑️  Deleting all tenants and their data...');
```

**P0-6 — Authenticate `paynow/verify` (A-13).**
```diff
--- a/app/api/billing/paynow/verify/route.ts
+++ b/app/api/billing/paynow/verify/route.ts
@@
-import { NextRequest, NextResponse } from 'next/server'
-import { prisma } from '@/lib/prisma'
-import { logger } from '@/lib/logger'
+import { NextRequest, NextResponse } from 'next/server'
+import { prisma } from '@/lib/prisma'
+import { logger } from '@/lib/logger'
+import { getAuthContext } from '@/lib/auth'
@@
-  try {
-    const { searchParams } = new URL(request.url)
-    const reference = searchParams.get('reference')
+  try {
+    const ctx = await getAuthContext()
+    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
+    const { searchParams } = new URL(request.url)
+    const reference = searchParams.get('reference')
@@
-    const payment = await prisma.payment.findFirst({
-      where: {
-        OR: [
-          { providerPaymentId: reference },
-          {
-            providerResponse: {
-              path: ['reference'],
-              equals: reference
-            }
-          }
-        ]
-      },
+    const tenantScope = ctx.isSuperAdmin ? {} : { tenantId: ctx.tenantId ?? '__none__' }
+    const payment = await prisma.payment.findFirst({
+      where: {
+        ...tenantScope,
+        OR: [
+          { providerPaymentId: reference },
+          { providerResponse: { path: ['reference'], equals: reference } }
+        ]
+      },
```

### Phase 1

**P1-1 — Shared tenant-resource loader (fixes the A-4…A-11 class).** New file `lib/tenant-guard.ts`:
```ts
import { prisma } from '@/lib/prisma'
import type { AuthContext } from '@/lib/auth'

/**
 * Loads a tenant-owned record and enforces isolation in one place.
 * SUPER_ADMIN may cross tenants; everyone else is pinned to ctx.tenantId.
 * Returns null when the record does not exist OR is not visible to the caller
 * (callers must map null -> 404, never distinguishing the two).
 */
export async function requireTenantResource<T extends { tenantId: string | null }>(
  model: { findFirst: (args: any) => Promise<T | null> },
  id: string,
  ctx: AuthContext,
  opts: { include?: any; select?: any } = {}
): Promise<T | null> {
  if (!ctx.isSuperAdmin && !ctx.tenantId) return null // fail closed
  const where = ctx.isSuperAdmin ? { id } : { id, tenantId: ctx.tenantId as string }
  return model.findFirst({ where, ...opts })
}
```
Apply at each IDOR site, e.g. `admin/users/[id]/route.ts`:
```diff
-    const user = await prisma.user.findUnique({
-      where: { id: targetUserId },
-      select: { id: true, name: true, email: true, role: true, isActive: true, phone: true, createdAt: true }
-    })
+    const user = await requireTenantResource(prisma.user, targetUserId, authCtx, {
+      select: { id: true, name: true, email: true, role: true, isActive: true, phone: true, createdAt: true, tenantId: true }
+    })
     if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
```
Repeat for `admin/contractors/[id]`, `.../categories`, `.../ratings`, `tickets/[id]/rating-data`, `tickets/[id]/status` (admin branch), `tickets/[id]/approve-work` (admin branch), and `admin/tickets/[id]/quote-requests/[quoteRequestId]` (load the parent ticket via the helper before touching the quote request).

**P1-2 — Enforce subscription on writes (C-1) and fix the guard's stale metadata read.** First correct `lib/subscription-guard.ts` to use `getAuthContext()` instead of `sessionClaims` (otherwise wiring it in breaks every tenant write):
```diff
--- a/lib/subscription-guard.ts
+++ b/lib/subscription-guard.ts
@@
-import { auth } from '@clerk/nextjs/server'
+import { getAuthContext } from '@/lib/auth'
@@ export async function subscriptionCheck(
-  const { userId: clerkUserId, sessionClaims } = await auth()
-  if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
-
-  const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, string | null>
-  const role = (meta.role as string) ?? 'END_USER'
-  const tenantId = meta.tenantId ?? null
-
-  if (role === 'SUPER_ADMIN') return null
+  const ctx = await getAuthContext()
+  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
+  const { role, tenantId } = ctx
+  if (role === 'SUPER_ADMIN') return null
   if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
```
Then call it at the top of each mutating tenant handler (POST/PATCH/DELETE), e.g. `app/api/tickets/route.ts` POST:
```diff
   export async function POST(request: NextRequest) {
+    const gate = await subscriptionCheck(request, 'write')
+    if (gate) return gate
     const rateLimitResponse = await rateLimitCheck(request, 'api')
```
Do the same in ticket/asset/invoice/user/contractor create+update routes. (Longer term, hoist this into `middleware.ts` keyed on method+path so it can't be forgotten.)

**P1-3 — Hash OTP + attempt lockout (F-1).** Requires a migration adding `attempts Int @default(0)` to `PasswordResetToken` and `@@unique` scoping. Store a hash, not the code:
```diff
--- a/app/api/auth/send-otp/route.ts
+++ b/app/api/auth/send-otp/route.ts
@@
-import { randomBytes } from 'crypto'
+import { randomBytes, createHash } from 'crypto'
@@
-    const otp = randomBytes(3).readUIntBE(0, 3) % 1000000
-    const otpString = String(otp).padStart(6, '0')
+    const otp = randomBytes(4).readUInt32BE(0) % 1000000
+    const otpString = String(otp).padStart(6, '0')
+    const otpHash = createHash('sha256').update(otpString).digest('hex')
@@
-    await prisma.passwordResetToken.create({
-      data: { userId: user.id, token: otpString, type: 'OTP', method: method as 'email' | 'sms',
+    // invalidate any prior active OTPs (single active token)
+    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, type: 'OTP' } })
+    await prisma.passwordResetToken.create({
+      data: { userId: user.id, token: otpHash, type: 'OTP', method: method as 'email' | 'sms',
               phone: method === 'sms' ? phone : null, expiresAt } })
```
```diff
--- a/app/api/auth/reset-password/route.ts
+++ b/app/api/auth/reset-password/route.ts
@@
+import { createHash } from 'crypto'
@@
-    const resetToken = await prisma.passwordResetToken.findFirst({
-      where: { userId: user.id, token: otp, type: 'OTP', expiresAt: { gt: new Date() } }
-    })
-    if (!resetToken) {
-      return NextResponse.json({ message: 'Invalid or expired OTP' }, { status: 400 })
-    }
+    const otpHash = createHash('sha256').update(otp).digest('hex')
+    const resetToken = await prisma.passwordResetToken.findFirst({
+      where: { userId: user.id, type: 'OTP', expiresAt: { gt: new Date() } }
+    })
+    if (!resetToken || resetToken.attempts >= 5) {
+      // consume on lockout so it can't be ground down
+      if (resetToken) await prisma.passwordResetToken.delete({ where: { id: resetToken.id } })
+      return NextResponse.json({ message: 'Invalid or expired OTP' }, { status: 400 })
+    }
+    if (resetToken.token !== otpHash) {
+      await prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { attempts: { increment: 1 } } })
+      return NextResponse.json({ message: 'Invalid or expired OTP' }, { status: 400 })
+    }
```
Also change `reset-password:46-51` to a **generic** message (fix F-3 enumeration): return the same "Invalid or expired OTP" whether or not the email exists.

**P1-4 — Authenticate `quotes` GET; stop anonymous Tenant creation (A-12).**
```diff
--- a/app/api/quotes/route.ts
+++ b/app/api/quotes/route.ts
@@ export async function GET(request: NextRequest) {
-  try {
-    // This endpoint could be used by admins to fetch all quote requests
+  try {
+    const ctx = await getAuthContext()
+    if (!ctx?.isSuperAdmin) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
```
For POST: keep the public lead-capture but do **not** create a `Tenant`; write the lead to a `Quote` with a null/`leadEmail` field and add `rateLimitCheck(request, 'auth')` at the top. (Tenant provisioning should happen only at real signup/onboarding.)

**P1-5 — Verify webhook amount + strict reference (D-1/D-2).** In `app/api/payments/paynow/webhook/route.ts`, before the `paid`/`delivered` branch (after the payment is resolved, ~line 154):
```diff
+    // D-1: never activate on an underpayment. Compare against the amount we recorded at initiate time.
+    const expected = payment.amount
+    const received = Number(processedData.amount)
+    const currencyOk = (payment.currency || 'USD') === (processedData.currency || 'USD')
+    const amountOk = Number.isFinite(received) && received + 1e-6 >= expected && currencyOk
+    if ((paynowStatus === 'paid' || paynowStatus === 'delivered') && !amountOk) {
+      logger.error(`[Webhook:${requestId}] Amount mismatch: expected ${expected} got ${received}`)
+      await BillingService.processFailedPayment(payment.id, `Underpayment: expected ${expected}, got ${received}`)
+      return NextResponse.json({ status: 'rejected', message: 'Amount mismatch' }, { status: 409 })
+    }
```
And remove the fuzzy fallback (D-2) — delete the `:98-110` "most recent pending payment" block; if no payment matches `providerPaymentId` or the embedded reference, log and return 404 rather than settling an unrelated invoice. (`providerPaymentId` is already `@unique`, so strict matching is safe and idempotent.)

**P1-6 — Gate or remove `register-tenant` (I-1).** If Clerk is the system of record, delete `app/api/auth/register-tenant/route.ts` and route all signup through Clerk + `api/onboarding/complete`. If it must stay temporarily, add `rateLimitCheck(request, 'auth')` and a CAPTCHA, and stop writing an admin `User`/`Subscription` until email is verified.

---

## 10. Verification & regression plan

Run each as a black-box check against staging after the fix. `T_A`/`T_B` = two tenants; `U_A`/`U_B` their users; `SA` a super-admin.

| Fix | Test | Expected |
|---|---|---|
| A-1 | `U_B` GETs `T_A`'s `invoices/<id>/summary-pdf` | 403 (was 200+PDF) |
| A-2 | `U_B` GETs `admin/invoices/summary?invoiceId=<T_A>` | 403 |
| A-3 | Null-tenant user GETs `/api/assets` | 403; no rows (was full table) |
| A-4…A-11 | `T_B` admin GETs/POSTs each IDOR route with `T_A` ids (users, contractors, categories, ratings, rating-data, quote-request award, ticket status, approve-work) | 404/403; no cross-tenant mutation |
| A-12 | Anonymous GET `/api/quotes` | 403; anonymous POST does not create a `Tenant` row (`select count(*)` unchanged) |
| A-13 | Anonymous GET `paynow/verify?reference=…` | 401 |
| C-1 | Set `T_A` subscription `status=READ_ONLY`; `U_A` POSTs a ticket via curl | 403 "Subscription required" (was 201) |
| C-1 | BASIC tenant at `maxTicketsPerMonth` POSTs a ticket | 403 quota |
| F-1 | Brute 100 wrong OTPs for one user | locked after 5, token consumed; DB `token` column is a 64-hex hash, not 6 digits |
| F-3 | reset-password for unknown email | generic "Invalid or expired OTP" (no 404) |
| D-1 | Replay a webhook with `amount` < plan price | 409; subscription NOT extended |
| D-2 | Webhook with unknown reference while a large pending invoice exists | 404; the pending invoice stays pending |
| E-1 | `git log --all -- test-email.js` after purge | no results; app password revoked in Google |
| E-2 | Run reset script with `NODE_ENV=production` | exits non-zero, deletes nothing |

**Security-regression checklist to re-run after any auth/tenancy/billing change:** (1) every `[id]` route rejects a foreign-tenant id; (2) no route uses `tenantId: x ?? undefined`; (3) `grep -rn "findUnique({ where: { id" app/api` returns only non-tenant models; (4) every mutating tenant route calls `subscriptionCheck`; (5) webhook rejects underpayment; (6) OTP column stores a hash; (7) no new `console.log` of passwords/tokens.

---

## 11. Load-test plan (k6 skeleton)

Target the three hottest paths: ticket list (`GET /api/tickets`), ticket create (`POST /api/tickets`), invoice list (`GET /api/admin/invoices`). Placeholder SLOs — **replace once real traffic numbers exist** (§0):

- p95 < 400 ms, p99 < 800 ms read; p95 < 700 ms write.
- error rate < 0.5%.
- sustained 50 RPS/read, 10 RPS/write per instance without DB pool exhaustion.

```js
// k6 run --vus 50 --duration 3m tickets_load.js
import http from 'k6/http'; import { check, sleep } from 'k6'
export const options = {
  scenarios: {
    read:  { executor: 'constant-arrival-rate', rate: 50, timeUnit: '1s', duration: '3m', preAllocatedVUs: 100 },
    write: { executor: 'constant-arrival-rate', rate: 10, timeUnit: '1s', duration: '3m', preAllocatedVUs: 50, exec: 'writeTicket' },
  },
  thresholds: { http_req_duration: ['p(95)<400','p(99)<800'], http_req_failed: ['rate<0.005'] },
}
const BASE = __ENV.BASE_URL, H = { Authorization: `Bearer ${__ENV.CLERK_TOKEN}` }
export default function () { check(http.get(`${BASE}/api/tickets`, { headers: H }), { 200: r => r.status === 200 }); sleep(1) }
export function writeTicket () {
  const body = JSON.stringify({ title: `load-${__VU}-${__ITER}`, description: 'x', type: 'REPAIR', priority: 'LOW' })
  check(http.post(`${BASE}/api/tickets`, body, { headers: { ...H, 'Content-Type': 'application/json' } }), { 201: r => r.status === 201 })
}
```
**Watch during the run:** Postgres `max_connections` vs (PM2 workers × Prisma pool size) — set `connection_limit` in `DATABASE_URL` so `workers × limit < max_connections`; Prisma p95 query time; PM2 event-loop lag; memory (in-process metrics reset on restart, so scrape externally).

---

## 12. Go-live checklist (staging → prod)

- [ ] All Phase 0 diffs merged; all Critical/High closed or explicitly risk-accepted with sign-off.
- [ ] Gmail app password rotated; `test-email.js`/`k.env`/`USER_CREDENTIALS.md` purged from history; secret scan clean.
- [ ] Env/secret parity staging↔prod; secrets in a vault/KMS, not `.env` on the box; rotation policy documented.
- [ ] Migrations dry-run on a prod clone; **backup taken and a restore drill executed** (record RTO/RPO).
- [ ] Rollback rehearsed (previous release + DB backward-compatible).
- [ ] CI green: typecheck + lint + build + the new auth/tenancy/billing tests + `npm audit` triaged.
- [ ] Branch protection on; no deploy on red.
- [ ] Health checks green behind the LB; alerts armed (5xx rate, p99 latency, webhook failures, DB connection saturation).
- [ ] On-call assigned; runbook for payment-webhook failures and tenant-isolation incidents.
- [ ] Rate limiter fail-closed on auth paths, backed by Redis, trusted-proxy configured.
- [ ] Feature flags for the legacy-auth removal set correctly.
- [ ] Tenant-isolation regression suite passing; you are willing to warrant isolation contractually.

---

## Appendix A — commands to complete/repeat the sweep

```bash
# Wired-in proof for any control:
grep -rn "withSubscriptionGuard\|subscriptionCheck" app/ | grep -v lib/subscription-guard.ts   # -> 1 line today
grep -rn "checkTicketLimit\|checkUserLimit\|canAccessFeature" app/ | grep -v lib/feature-gating.ts
grep -rn "trial-management" app/ lib/ components/                                              # -> empty today
grep -rln "from '@/lib/validation'\|from '@/lib/api-errors'\|from '@/lib/pagination'" app/     # -> only route.optimized.ts
# Tenancy footguns and IDOR candidates:
grep -rn "tenantId: [a-zA-Z.]* ?? undefined" app/
grep -rn "findUnique({ where: { id" app/api
# Validation coverage:
for f in $(grep -rl "await request.json()" app/api --include=route.ts); do grep -q "z\." "$f" || echo "UNVALIDATED: $f"; done
# Secret history:
git log --all --oneline -- test-email.js k.env
# Money as Float:
grep -n "Float" prisma/schema.prisma
```
