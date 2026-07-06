# Private R2 bucket migration

**Goal:** stop serving user files (invoices, proof-of-payment, asset images, KYC documents) from a world-readable bucket. Files are now served through an authenticated, tenant-scoped access route that issues short-lived presigned URLs.

## What changed in code

- **`uploadToR2()`** now stores objects under a tenant-scoped key (`t/<tenantId>/<folder>/...`) and returns an **in-app access path** (`/api/files/<key>`) instead of a public bucket URL. All 11 upload call sites pass the owning `tenantId`.
- **`GET /api/files/<key>`** (`app/api/files/[...key]/route.ts`) authenticates the caller, authorizes by the tenant encoded in the key (super-admin bypass), and 302-redirects to a 5-minute presigned URL. Fails closed.
- **`getKeyFromUrl()`** resolves keys from the new app paths, legacy public URLs, and bare keys, so both old and new stored values can be served.
- Object keys use `crypto` randomness (not `Math.random`).

## Deploy steps (in order)

1. **Deploy the code.** New uploads immediately go through `/api/files/...` and presigned URLs (presigning works whether the bucket is public or private), so this is safe to ship before flipping the bucket.
2. **Backfill existing rows.** Run `scripts/backfill-file-urls.js` (see below) to rewrite stored public URLs to `/api/files/<key>` across every file-URL column. Take a DB backup first.
3. **Flip the bucket to private** in Cloudflare R2:
   - Remove the public-access / custom-domain public binding for the bucket (the thing `R2_PUBLIC_URL` pointed at).
   - Keep the S3 API credentials (`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`) — presigning uses them.
   - `R2_PUBLIC_URL` is no longer used to serve files; it may remain set for legacy `getKeyFromUrl` parsing but is not required.
4. **Verify:** as a tenant user, open an invoice/asset image → it loads via a presigned redirect. As a *different* tenant, request the same `/api/files/<key>` → expect 403. Unauthenticated → 401.

## Authorization model & known limitation

- **New objects** are tenant-scoped (`t/<tenantId>/...`): only the owning tenant (or a super-admin) can fetch them.
- **Legacy objects** (keys like `assets/...`, and rows backfilled to `/api/files/assets/...`) carry no tenant prefix, so the access route treats them as *authenticated-but-untenanted* — any signed-in user can fetch them, but the world cannot. This closes the public-exposure hole. To achieve full per-tenant isolation of legacy objects, re-key them (copy each object to `t/<tenantId>/...` and update the row); that is a heavier, optional follow-up.
- Authorization is at the **tenant** level, not per-record. Within a tenant, any authenticated user who knows a key can fetch it (keys now use crypto randomness, so they are not guessable). Per-record authorization (verifying the caller may see *this specific* invoice/asset) is a possible future tightening.

## Env

No new env vars are required. Optional:
- `FILE_URL_BACKFILL=yes` — required to run the backfill script (safety guard).
