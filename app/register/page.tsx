import Link from "next/link";
import { InvitationRegistrationForm } from "@/components/auth/invitation-registration-form";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ token?: string; setup?: string }> }) {
  const { token, setup } = await searchParams;
  if (!token) return <main className="content-band"><div className="content-inner auth-panel"><h1>APGI account registration</h1><p>Open the course invitation email to create an account.</p><Link className="secondary-button" href="/alp-sign-in">Sign in</Link></div></main>;
  return <main className="content-band"><div className="content-inner auth-panel"><h1>{setup === '1' ? 'Choose your password and finish joining V2' : 'Create your APGI account'}</h1><p>You do not need to sign in or know an existing password to complete this step. Use the same email address that received your invitation.</p><p>Choose your password below. Next, confirm your email using the confirmation message we send you, then complete and save your profile. Only your existing invited access will be activated. Your Version 1 account stays unchanged.</p><InvitationRegistrationForm token={token} setup={setup === '1'} /></div></main>;
}
