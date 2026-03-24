// Registration is now handled by Clerk. This endpoint is no longer active.
export async function POST() {
  return new Response(
    JSON.stringify({ error: 'Registration is handled via Clerk. Please use /sign-up.' }),
    { status: 410, headers: { 'Content-Type': 'application/json' } }
  )
}
