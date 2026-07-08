import { redirect } from 'next/navigation'
import { getAuthContext } from '@/lib/auth'
import { SupportChat } from '@/components/support/support-chat'

export const dynamic = 'force-dynamic'

/** Tenant-admin support: chat with the platform team. Admins only. */
export default async function SupportPage() {
  const ctx = await getAuthContext()
  if (!ctx) redirect('/sign-in')

  const configured = Boolean(process.env.PULSE_URL && process.env.ADMIN_ADAPTER_SECRET)
  const eligible = ctx.isAdmin && ctx.tenantId

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Message the TickTrack team. We&apos;ll reply right here.
      </p>

      {!configured ? (
        <p className="mt-8 text-sm text-gray-500">Support chat isn&apos;t available right now.</p>
      ) : !eligible ? (
        <p className="mt-8 text-sm text-gray-500">
          Support is available to organization admins. Ask an admin on your team to reach out.
        </p>
      ) : (
        <div className="mt-6">
          <SupportChat />
        </div>
      )}
    </main>
  )
}
