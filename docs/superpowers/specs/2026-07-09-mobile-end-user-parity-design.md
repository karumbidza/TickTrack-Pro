# Mobile End-User Parity — Design Spec

**Date:** 2026-07-09
**Status:** Approved (design), pending implementation plan
**Scope:** Bring the Expo/React Native mobile app (`mobile/`) to feature parity with the web app for the **END_USER** role — a Dashboard, a fuller ticket-creation form, and a read-only Asset Register.

---

## 1. Goal & Context

The mobile app currently gives end-users a tickets list, a minimal ticket form, and a profile. The web app gives end-users more: a stats dashboard, a richer ticket form (department, related asset, category), and an Asset Register. This spec closes that gap.

Auth, API, and data model are unchanged — the mobile app consumes existing Next.js routes with a Clerk bearer token via `mobile/lib/api.ts`. No server changes are required; every endpoint already exists.

**Confirmed API facts (from `app/api/tickets/route.ts`, `app/api/assets/route.ts`, `app/api/asset-categories/route.ts`):**
- `POST /api/tickets` requires only `title`, `description`, `type`, `priority`. Optional: `reporterName`, `reporterContact`, `department` (default `MAINTENANCE`), `assetId`, `categoryId`, `location`, `branchId` (falls back to the user's branch), plus `files[]` via FormData.
- `GET /api/tickets` returns the end-user's own tickets.
- `GET /api/assets` returns tenant assets (paginated, `page`/`limit`, read-only for end-users) with `category`, `status`, `location`, `brand`, `model`, `serialNumber`, `warrantyExpires`, and `repairHistory[]`.
- `GET /api/asset-categories` returns `{ categories: [{ id, name, color, icon, _count.assets }] }`.
- Ticket stats have **no** dedicated endpoint — the web derives them client-side from the tickets list. Mobile does the same.

**Enums:**
- Type: `REPAIR, MAINTENANCE, INSPECTION, INSTALLATION, REPLACEMENT, EMERGENCY, OTHER`
- Priority: `LOW, MEDIUM, HIGH, CRITICAL`
- Department: `IT, SALES, RETAIL, MAINTENANCE, PROJECTS, FACILITIES, OPERATIONS`

---

## 2. Navigation (approved: 4 tabs)

The tab bar (`mobile/app/(tabs)/_layout.tsx`) becomes role-aware with four end-user destinations. Contractor tabs are unchanged; end-user-only tabs are hidden for contractors via `href: null` (the pattern already used for the contractor Invoices tab).

| Tab | Route | End-user | Contractor |
|-----|-------|----------|------------|
| Home | `(tabs)/index` | **Dashboard** | Jobs list (current behaviour) |
| Tickets | `(tabs)/tickets` | My tickets list | hidden |
| Assets | `(tabs)/assets` | Asset Register | hidden |
| Invoices | `(tabs)/invoices` | hidden | Invoices (existing) |
| Profile | `(tabs)/profile` | Profile | Profile |

**Routing restructure:** today `(tabs)/index.tsx` *is* the tickets/jobs list. After this change:
- `(tabs)/index.tsx` → role-aware **Home**: renders the Dashboard for end-users, the existing Jobs list for contractors.
- The end-user tickets list moves into `(tabs)/tickets.tsx` (essentially the current end-user branch of `index.tsx`).
- `(tabs)/assets.tsx` is new.

Icons (lucide-react-native): Home `LayoutDashboard`, Tickets `FileText`/`Ticket`, Assets `Package`/`Boxes`, Profile `User`.

---

## 3. Dashboard (Home tab) — approved

A scrollable screen with pull-to-refresh. Data source: `GET /api/tickets` (one call; stats and recent list both derive from it).

Blocks, top to bottom:
1. **Greeting** — "Good <time>, <firstName>" + "<Company> · <Branch>". Name from Clerk `useUser()`; company/branch from the user's tenant/branch (available via profile data or the tickets payload).
2. **Approval alert** (conditional) — if any ticket is in `AWAITING_WORK_APPROVAL`, show a highlighted banner "N ticket(s) awaiting your approval" linking to the filtered tickets list. (Added per user request.)
3. **Stats 2×2** — Open (`OPEN`+`ASSIGNED`), In progress (`IN_PROGRESS`+`ON_SITE`), Completed (`COMPLETED`+`CLOSED`), Total. Tapping a card opens the Tickets tab filtered to that group.
4. **New ticket** — primary button → ticket form.
5. **Recent tickets** — latest 3 by `createdAt`, each tappable → `ticket/[id]`. "See all ›" → Tickets tab.

Status→group mapping lives in one helper reused by the dashboard and the tickets filter.

---

## 4. Ticket form (`mobile/app/new-ticket.tsx`) — approved

Replace the current chip-based form. Fields top to bottom:
- **Title** (text, required)
- **Description** (textarea, required)
- **Type · Priority** — two dropdowns on one row
- **Department** — dropdown (default `MAINTENANCE`)
- **Related Asset** — searchable dropdown, **optional**; options from `GET /api/assets` shown as "`assetNumber` — `name` (`location`)"
- **Category** — dropdown, **optional**; options from `GET /api/asset-categories`. **Auto-fills** from the selected asset's category and can still be changed.
- **Photos** — Camera (far left) and Library (far right), each half-width, via the existing `PhotoPicker`.
- **Create ticket** — primary submit.

**Reporter handling (approved):** reporter is auto-filled from the signed-in user — `reporterName` = Clerk full name, `reporterContact` = primary email — and sent with the request. A collapsed "Someone else reported this" toggle reveals editable Name/Contact fields for the exception case.

**Submit:** unchanged transport — `FormData` to `POST /api/tickets` with `title, description, type, priority, department, assetId?, categoryId?, reporterName, reporterContact, location?` and `files[]`. On success, `router.back()` and the tickets/dashboard lists refresh.

**New reusable components:**
- `components/select.tsx` — a `Dropdown` that opens a bottom-sheet/modal picker (label, value, options, onChange). Used for Type, Priority, Department.
- The Asset and Category pickers use the same sheet with a search box (Asset can be a long list).

---

## 5. Asset Register — approved (A1 + B1)

**Assets tab (`(tabs)/assets.tsx`)** — read-only list from `GET /api/assets`:
- Header with count ("N in <Company>").
- Search box (client-side filter on name/assetNumber) + category filter chips (from `GET /api/asset-categories`).
- Each row/card: `assetNumber`, name, category color dot + name, location, status badge. Tap → asset detail.
- Status badge colours reuse the theme's badge variants (map asset statuses like `ACTIVE`→good, `REPAIR_NEEDED`/`MAINTENANCE`→warning, `OUT_OF_SERVICE`/`RETIRED`/`DECOMMISSIONED`→neutral/critical).

**Asset detail (`mobile/app/asset/[id].tsx`, new)** — full detail (A1):
- Header: name, `assetNumber`, status.
- Spec card: Category, Location, Brand/Model, Serial, Warranty (and any of purchaseDate/price present).
- **Repair history**: the asset's `repairHistory[]` tickets as compact rows (ticket number, title, status badge); tap → `ticket/[id]` if it's one of the user's tickets.
- **"Report an issue on this asset"** button (B1): navigates to the ticket form with `assetId` and derived `categoryId` pre-filled (via route params, e.g. `router.push('/new-ticket?assetId=...&categoryId=...')`).

Detail data: `GET /api/assets/[id]` (exists, returns the asset with full `repairHistory`) — the detail screen fetches by id rather than relying on the list payload.

---

## 6. Components & Files

**New:**
- `mobile/app/(tabs)/tickets.tsx` — end-user tickets list (moved from `index.tsx`).
- `mobile/app/(tabs)/assets.tsx` — asset register list.
- `mobile/app/asset/[id].tsx` — asset detail.
- `mobile/components/select.tsx` — dropdown + searchable picker sheet.
- Dashboard component (in `(tabs)/index.tsx` or `mobile/components/dashboard.tsx`).

**Changed:**
- `mobile/app/(tabs)/_layout.tsx` — 4 role-aware tabs.
- `mobile/app/(tabs)/index.tsx` — role-aware Home (Dashboard | Jobs).
- `mobile/app/new-ticket.tsx` — full form + dropdowns + reporter toggle + asset prefill params.
- `mobile/lib/theme.ts` — asset-status badge mapping helper (if not already present).

**Unchanged:** `mobile/lib/api.ts` (client already supports GET/POST/FormData), auth, ticket detail screens, push notifications.

---

## 7. Error Handling & Edge Cases

- Every screen: loading state (existing `Loading`), error text on failed fetch (existing pattern in `index.tsx`), empty states (`EmptyState`).
- Dropdowns that depend on network (Asset, Category): show a disabled/loading state until options load; the form remains submittable without them (both optional).
- Asset prefill: if the asset has no category, only `assetId` is passed; category stays empty.
- Contractor accounts never see Dashboard/Tickets/Assets tabs (guarded by `href: null` and role checks), so no contractor regression.
- Reporter auto-fill: if Clerk name/email is missing, fields fall back to empty and the "someone else" toggle can be used.

---

## 8. Out of Scope

- Any web-side changes (no new API endpoints; stats stay client-derived).
- Asset create/edit/delete (admin-only on web; end-user is read-only).
- Ticket detail redesign — existing mobile ticket detail (view, cancel, approve work, rate) stays as-is.
- Contractor dashboard/analytics.
- Offline caching.

---

## 9. Verification

- `npx tsc --noEmit` clean in `mobile/`.
- `npx expo export --platform ios` bundles without error.
- Manual (Expo Go, signed in as `end.user+clerk_test@example.com`): Dashboard shows correct stats and approval alert; ticket form creates a ticket with department/asset/category and appears in the list; Asset Register lists assets, opens detail with repair history, and "Report an issue" pre-fills the form.
