import { redirect } from 'next/navigation'

// Legacy route — redirect to Clerk-powered sign-in
export default function OldSignInPage() {
  redirect('/sign-in')
}
