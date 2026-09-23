import { redirect } from "next/navigation";
import Link from "next/link";
import { acceptInvitation } from "@/server/actions/invitations/accept-invitation";
import { getCurrentSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function InvitationRedemptionPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getCurrentSession();

  if (!session) {
    const signInHref = `/alp-sign-in?next=${encodeURIComponent(`/invitations/${token}`)}`;
    const registerHref = `/register?token=${encodeURIComponent(token)}`;
    return <main className="page-shell"><header className="page-header"><p className="eyebrow">Course invitation</p><h1>Access your APGI invitation</h1><p>Sign in, or create an account with the email address that received this invitation. Course access is granted only after you accept the invitation.</p></header><div className="button-row"><Link className="primary-button" href={signInHref}>Sign in</Link><Link className="secondary-button" href={registerHref}>Create account</Link></div></main>;
  }

  async function redeem() {
    "use server";
    const result = await acceptInvitation(token);
    if (result.ok && result.courseId) {
      redirect(`/learn/${result.courseId}`);
    }
    redirect(`/invitations/${token}?error=${encodeURIComponent(result.error ?? "redemption_failed")}`);
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Course invitation</p>
        <h1>Accept your course invitation</h1>
        <p>The invitation will only grant access when it is valid, unexpired and matches your signed-in email address.</p>
      </header>
      <form action={redeem}>
        <button type="submit">Accept invitation</button>
      </form>
    </main>
  );
}
