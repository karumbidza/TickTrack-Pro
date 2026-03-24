// Email verification is now handled by Clerk automatically.
export async function GET() {
  return new Response(null, { status: 302, headers: { Location: '/sign-in' } })
}
export async function POST() {
  return new Response(
    JSON.stringify({ error: 'Email verification is handled by Clerk.' }),
    { status: 410, headers: { 'Content-Type': 'application/json' } }
  )
}
