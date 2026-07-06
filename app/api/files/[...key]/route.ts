import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth'
import { isValidObjectKey, keyTenantId, getSignedDownloadUrl, isR2Configured } from '@/lib/r2-storage'

export const dynamic = 'force-dynamic'

/**
 * GET /api/files/<key>
 * Authenticated, tenant-scoped access to private R2 objects. Authorizes by the
 * tenant encoded in the object key, then issues a short-lived presigned URL and
 * redirects to it. Fails closed on any mismatch.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { key: string[] } }
) {
  try {
    const ctx = await getAuthContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isR2Configured()) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 500 })
    }

    const key = (params.key || []).join('/')
    if (!isValidObjectKey(key)) {
      return NextResponse.json({ error: 'Invalid file key' }, { status: 400 })
    }

    // Authorize by the tenant encoded in the key.
    const owningTenant = keyTenantId(key)
    if (owningTenant) {
      // Tenant-scoped object: only the owning tenant (or a super admin) may read it.
      if (!ctx.isSuperAdmin && ctx.tenantId !== owningTenant) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    // owningTenant === null => legacy/public object minted before tenant scoping.
    // Any authenticated user may read it; these should be backfilled/migrated.

    const signedUrl = await getSignedDownloadUrl(key, 300)

    const res = NextResponse.redirect(signedUrl, 302)
    // Never cache the redirect: the presigned URL is short-lived and per-user.
    res.headers.set('Cache-Control', 'private, no-store')
    return res
  } catch (error) {
    console.error('[files] Error serving file:', error)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}
