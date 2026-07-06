# TickTrack Pro — Mobile (Expo / React Native)

A v1 native app for **contractors** (manage assigned jobs) and **end-users**
(raise and track tickets), talking to the existing TickTrack Pro Next.js API and
authenticating with the same Clerk instance as the web app.

## Stack
- Expo SDK 51 + Expo Router (file-based navigation, typed routes)
- `@clerk/clerk-expo` for auth (session persisted in the device keychain via `expo-secure-store`)
- Authenticated API client (`lib/api.ts`) that attaches the Clerk session token as a `Bearer` header — `clerkMiddleware` on the server accepts it exactly like the web cookie session, so `getAuthContext()` resolves the same user/role/tenant.
- Design tokens mirrored from the web redesign (`lib/theme.ts`): warm paper + violet accent, DM Sans / DM Mono.

## Setup
```bash
cd mobile
npm install            # or: npx expo install  (to pin native module versions)
cp .env.example .env    # then fill in the two values below
```
`.env`:
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — the SAME Clerk publishable key the web app uses.
- `EXPO_PUBLIC_API_URL` — base URL of the deployed Next.js API (e.g. `https://tick-trackpro.com`), no trailing slash.

## Run
```bash
npx expo start          # then press i (iOS sim) / a (Android) / scan QR in Expo Go
```

## What's implemented
- **Auth**: email/password sign-in via Clerk; session persists across launches; sign-out.
- **Role-aware tabs**: contractors get Jobs + Invoices + Profile; end-users get Tickets + Profile.
- **Contractor**: assigned jobs list (`/api/contractor/jobs`), job detail with real status actions — accept / decline / start / on-site / complete (`PATCH /api/contractor/jobs/:id`), **submit work description** (`POST /api/tickets/:id/work-description`), and invoices list (`/api/contractor/invoices`).
- **End-user**: my tickets list (`/api/tickets`), ticket detail, create ticket with **photo attachments** from camera/library (`POST /api/tickets` multipart, `files`), **approve / request-changes** on completion (`POST /api/tickets/:id/approve-work`), and a **service rating** form (`POST /api/tickets/:id/rating`).
- **Photos**: reusable `PhotoPicker` (expo-image-picker, camera + multi-select library) → FormData file parts.
- **Push notifications**: the device registers its Expo push token with the server on launch (`POST /api/notifications/device`); tapping a notification deep-links to the ticket. Server fires pushes on job assignment, work approval / change-request, and invoice payment (`lib/push.ts` → Expo push API). Requires the `push_tokens` migration (`prisma migrate deploy`).

## Server prerequisite (one-time)
Mobile clients authenticate with a **Bearer token**, not a cookie. Confirm the web
app's `middleware.ts` `clerkMiddleware` accepts `Authorization: Bearer` (Clerk
supports it by default). If a custom JWT template is required for long-lived
tokens, create one in the Clerk dashboard and pass its name to `getToken({ template })`
in `lib/api.ts`.

## Not yet (next)
- Contractor invoice **submission** from mobile (view is done; creation is web-only for now).
- In-ticket chat/messages with attachments (`/api/tickets/:id/messages`).
- Offline caching / optimistic updates.

## Status / verification
This is a hand-authored scaffold. It has **not** been run through an Expo build or a
device/simulator in this environment — install dependencies and run `npx expo start`
to verify. `npm run typecheck` (after `npm install`) checks types.
