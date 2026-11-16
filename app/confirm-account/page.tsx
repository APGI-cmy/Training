import Link from "next/link";
import { confirmAccount } from "@/server/actions/auth/confirm-account";

export const dynamic = "force-dynamic";

export default async function ConfirmAccountPage({ searchParams }: { searchParams: Promise<{ token_hash?: string; error?: string }> }) {
  const { token_hash, error } = await searchParams;
  return <main className="content-band"><div className="content-inner auth-panel">
    <p className="eyebrow">Welcome to APGI Training</p><h1>Confirm your email</h1>
    {token_hash && !error ? <>
      <p>Select Confirm below to verify your email address and go straight to your learner profile.</p>
      <form action={confirmAccount}>
        <input type="hidden" name="token_hash" value={token_hash} />
        <button className="primary-button" type="submit">Confirm email and complete profile</button>
      </form>
    </> : <>
      <p className="form-error" role="alert">This confirmation link is missing, expired or already used. If you have already confirmed your email, sign in. Otherwise, use your latest invitation to register again or recover your account below.</p>
      <div className="button-row"><Link className="primary-button" href="/alp-sign-in">Sign in</Link><Link className="secondary-button" href="/forgot-password">Recover your account</Link></div>
    </>}
  </div></main>;
}
