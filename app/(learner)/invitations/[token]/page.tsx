import { redirect } from "next/navigation";
import { acceptInvitation } from "@/server/actions/invitations/accept-invitation";
import { requireSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function InvitationRedemptionPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  await requireSession();
  const { token } = await params;

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
