import { ForgotPasswordForm } from "@/components/auth/password-recovery-forms";
import { safeRecoveryNext } from "@/lib/auth/safe-recovery-next";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <main className="content-band"><div className="content-inner auth-panel">
    <p className="eyebrow">Account recovery</p><h1>Forgot your password?</h1>
    <p>Enter the email address you use for APGI Training. We will send a link so you can choose a new password.</p>
    <ForgotPasswordForm next={safeRecoveryNext(next)} />
  </div></main>;
}
