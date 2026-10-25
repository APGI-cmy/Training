import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession, signOut } from "@/server/auth/session";
import { invitationErrorMessage } from "@/lib/invitations/redemption-feedback";
import { getInvitationEntryDestination } from "@/server/services/invitations/entry-destination";

export const dynamic = "force-dynamic";

export default async function InvitationRedemptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const session = await getCurrentSession();
  const invitationPath = `/invitations/${token}`;
  let feedback = invitationErrorMessage(error);

  if (!session) {
    const signInHref = `/alp-sign-in?next=${encodeURIComponent(`/invitations/${token}`)}`;
    const registerHref = `/register?token=${encodeURIComponent(token)}`;
    return (
      <main className="content-band">
        <div className="content-inner auth-panel">
          <p className="eyebrow">Platform invitation</p>
          <h1>Access your APGI invitation</h1>
          <p>
            If you have not created your separate Version 2 account, choose
            your password below first. If you already have a V2 account, sign in.
            Use the email address that received this invitation. Complete and save your profile to activate your
            invitation. Learner courses appear on the dashboard, business owners
            open their company workspace, and platform administrators open
            Administration.
          </p>
          {feedback ? (
            <p className="form-error" role="alert">
              {feedback}
            </p>
          ) : null}
          <div className="button-row">
            <Link className="primary-button" href={`${registerHref}&setup=1`}>
              First time on V2? Choose my password
            </Link>
            <Link className="secondary-button" href={signInHref}>
              I already have a V2 account — sign in
            </Link>
          </div>
          <p><Link href={`/forgot-password?next=${encodeURIComponent(invitationPath)}`}>Forgot my V2 password</Link></p>
        </div>
      </main>
    );
  }

  const entry = await getInvitationEntryDestination(session, token);
  if (entry.destination) redirect(entry.destination);
  feedback = invitationErrorMessage(entry.error);

  async function switchAccount() {
    "use server";
    await signOut();
    redirect(invitationPath);
  }

  return (
    <main className="content-band">
      <div className="content-inner auth-panel">
        <p className="eyebrow">Platform invitation</p>
        <h1>Check your invitation</h1>
        <p>
          Use the email address that received your invitation. Saving your
          profile activates your valid course, company-owner or
          platform-administrator invitation automatically.
        </p>
        <p>
          Signed in as <strong>{session.user.email}</strong>. This must be the
          email address that received the invitation.
        </p>
        {feedback ? (
          <p className="form-error" role="alert">
            {feedback}
          </p>
        ) : null}
        <p>
          If this is a different account, sign out below. Your invitation will
          stay open so you can sign in or create the matching account.
        </p>
        <form action={switchAccount}>
          <button className="secondary-button" type="submit">
            Sign out and use another account
          </button>
        </form>
      </div>
    </main>
  );
}
