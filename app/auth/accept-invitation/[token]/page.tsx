import { redirect } from 'next/navigation'

// Clerk now handles invitation acceptance — redirecting to sign-in
export default function AcceptInvitationPage() {
  redirect('/sign-in')
}
