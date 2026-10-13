import Link from "next/link";
import { cookies } from "next/headers";
import { ResetPasswordForm } from "@/components/auth/password-recovery-forms";
import { beginPasswordReset } from "@/server/actions/auth/password-recovery";
import { safeRecoveryNext } from "@/lib/auth/safe-recovery-next";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token_hash?: string; next?: string; error?: string }> }) {
  const { token_hash, next, error } = await searchParams;
  const cookieStore = await cookies();
  return <main className="content-band"><div className="content-inner auth-panel">
    <p className="eyebrow">Account recovery</p><h1>Reset your password</h1>
    {error ? <p className="form-error" role="alert">This reset link is invalid, expired or has already been used. Request a new reset email.</p> : null}
    {token_hash && !error ? <>
      <p>Select Continue to verify the link from your email. You will then choose a new password.</p>
      <form action={beginPasswordReset}>
        <input type="hidden" name="token_hash" value={token_hash} />
        <input type="hidden" name="next" value={safeRecoveryNext(next)} />
        <button className="primary-button" type="submit">Continue to reset password</button>
      </form>
    </> : cookieStore.get("alp_recovery_token") && !error ? <>
      <p>Choose a password of at least 12 characters. After saving, sign in using your new password.</p>
      <ResetPasswordForm />
    </> : <Link className="primary-button" href="/forgot-password">Request a new reset email</Link>}
  </div></main>;
}
