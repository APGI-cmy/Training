import { ForgotPasswordForm } from "@/components/auth/password-recovery-forms";
import { safeRecoveryNext } from "@/lib/auth/safe-recovery-next";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const production = process.env.ALP_ENVIRONMENT === 'training-production';
  return <main className="content-band"><div className="content-inner auth-panel">
    <p className="eyebrow">Account recovery</p><h1>Recover your account</h1>
    {production ? <>
      <p>Enter the email address used for your training account or invitation. We will email a password reset or account setup link for your existing access. You do not need to sign in first.</p>
      <p>Email links are time-limited and single-use. Use the newest email; if its link has expired, request another here when you are ready. Never send your password to anyone.</p>
    </> : <>
      <p>Enter your email address. If you already have a Version 2 account, we will email a link to reset its password. If you have an active invitation but have not created your Version 2 account, we will email a link directly to the password-setup page. Neither link requires you to sign in first.</p>
      <p>Version 2 uses a separate account from Version 1. A saved password does not expire here, but email links are time-limited and single-use. Use the newest email; if its link has expired, request another here when you are ready.</p>
    </>}
    <ForgotPasswordForm next={safeRecoveryNext(next)} />
  </div></main>;
}
