import { redirect } from "next/navigation";
import Link from "next/link";
import { acceptInvitation } from "@/server/actions/invitations/accept-invitation";
import { getCurrentSession, signOut } from "@/server/auth/session";
import { invitationErrorMessage } from "@/lib/invitations/redemption-feedback";

export const dynamic = "force-dynamic";

export default async function InvitationRedemptionPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const session = await getCurrentSession();
  const invitationPath = `/invitations/${token}`;
  const feedback = invitationErrorMessage(error);

  if (!session) {
    const signInHref = `/alp-sign-in?next=${encodeURIComponent(`/invitations/${token}`)}`;
    const registerHref = `/register?token=${encodeURIComponent(token)}`;
    return <main className="content-band"><div className="content-inner auth-panel"><p className="eyebrow">Course invitation</p><h1>Access your APGI invitation</h1><p>Sign in, or create an account with the email address that received this invitation. Course access is granted only after you accept the invitation.</p>{feedback ? <p className="form-error" role="alert">{feedback}</p> : null}<div className="button-row"><Link className="primary-button" href={signInHref}>Sign in</Link><Link className="secondary-button" href={registerHref}>Create account</Link></div></div></main>;
  }

  async function switchAccount() {
    "use server";
    await signOut();
    redirect(invitationPath);
  }

  async function redeem() {
    "use server";
    const result = await acceptInvitation(token);
    if (result.ok && result.courseId) {
      redirect(`/profile?onboarding=invitation&next=${encodeURIComponent(`/learn/${result.courseId}`)}`);
    }
    redirect(`/invitations/${token}?error=${encodeURIComponent(result.error ?? "redemption_failed")}`);
  }

  return (
    <main className="content-band">
      <div className="content-inner auth-panel">
        <p className="eyebrow">Course invitation</p>
        <h1>Accept your course invitation</h1>
        <p>The invitation will only grant access when it is valid, unexpired and matches your signed-in email address. You will then be guided to complete your learner profile.</p>
      <p>Signed in as <strong>{session.user.email}</strong>. This must be the email address that received the invitation.</p>
      {feedback ? <p className="form-error" role="alert">{feedback}</p> : null}
      <form action={redeem}>
        <button className="primary-button" type="submit">Accept invitation and complete profile</button>
      </form>
      <p>If this is a different account, sign out below. Your invitation will stay open so you can sign in or create the matching account.</p>
      <form action={switchAccount}>
        <button className="secondary-button" type="submit">Sign out and use another account</button>
      </form>
      </div>
    </main>
  );
}
