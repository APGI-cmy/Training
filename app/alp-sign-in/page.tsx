import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

export default async function AlpSignInPage({ searchParams }: { searchParams: Promise<{ next?: string; passwordReset?: string }> }) {
  const { next, passwordReset } = await searchParams;
  const returnTo = next?.startsWith("/") && !next.startsWith("//") ? next : undefined;
  return (
    <main className="content-band">
      <div className="content-inner auth-panel">
        <h1>APGI sign in</h1>
        {passwordReset === "success" ? <p className="form-success" role="status">Your password has been updated. Sign in with your new password.</p> : null}
        <LoginForm returnTo={returnTo} />
        <p><Link href={`/forgot-password${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ""}`}>Forgot password?</Link></p>
      </div>
    </main>
  );
}
