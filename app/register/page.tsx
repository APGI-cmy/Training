import Link from "next/link";
import { InvitationRegistrationForm } from "@/components/auth/invitation-registration-form";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) return <main className="content-band"><div className="content-inner auth-panel"><h1>APGI account registration</h1><p>Open the course invitation email to create an account.</p><Link className="secondary-button" href="/alp-sign-in">Sign in</Link></div></main>;
  return <main className="content-band"><div className="content-inner auth-panel"><h1>Create your APGI account</h1><p>Use the same email address that received the course invitation. Account creation alone does not grant course access.</p><InvitationRegistrationForm token={token} /></div></main>;
}
