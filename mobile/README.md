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

## What's implemented (v1)
- **Auth**: email/password sign-in via Clerk; session persists across launches; sign-out.
- **Role-aware tabs**: contractors get Jobs + Invoices + Profile; end-users get Tickets + Profile.
- **Contractor**: assigned jobs list (`/api/contractor/jobs`), job detail with real status actions — accept / decline / start / on-site / complete (`PATCH /api/contractor/jobs/:id`), and invoices list (`/api/contractor/invoices`).
- **End-user**: my tickets list (`/api/tickets`), ticket detail, and create ticket (`POST /api/tickets`).

## Server prerequisite (one-time)
Mobile clients authenticate with a **Bearer token**, not a cookie. Confirm the web
app's `middleware.ts` `clerkMiddleware` accepts `Authorization: Bearer` (Clerk
supports it by default). If a custom JWT template is required for long-lived
tokens, create one in the Clerk dashboard and pass its name to `getToken({ template })`
in `lib/api.ts`.

## Not yet in v1 (next)
- Push notifications (Expo push + a device-token registration endpoint).
- Photo/attachment upload from the camera (wire `expo-image-picker` → the existing
  `/api/upload/*` routes as multipart `FormData`).
- End-user approve-completion + rating; contractor work-description + invoice submission.
- Offline caching.

## Status / verification
This is a hand-authored scaffold. It has **not** been run through an Expo build or a
device/simulator in this environment — install dependencies and run `npx expo start`
to verify. `npm run typecheck` (after `npm install`) checks types.
