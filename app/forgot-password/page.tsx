import { ForgotPasswordForm } from "@/components/auth/password-recovery-forms";
import { safeRecoveryNext } from "@/lib/auth/safe-recovery-next";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <main className="content-band"><div className="content-inner auth-panel">
    <p className="eyebrow">Account recovery</p><h1>Recover your account</h1>
    <p>Enter your invited email address. If you already have an account, we will email a link to choose a new password. If you have not finished joining, we will resend your active invitation so you can create your account.</p>
    <p>Version 2 uses a separate account from Version 1. A saved password does not expire here, but email links are time-limited and single-use. Use the newest email; if its link has expired, request another here when you are ready.</p>
    <ForgotPasswordForm next={safeRecoveryNext(next)} />
  </div></main>;
}
