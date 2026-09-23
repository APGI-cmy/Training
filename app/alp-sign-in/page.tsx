import { LoginForm } from "@/components/auth/login-form";

export default async function AlpSignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const returnTo = next?.startsWith("/") && !next.startsWith("//") ? next : undefined;
  return (
    <main className="content-band">
      <div className="content-inner auth-panel">
        <h1>APGI sign in</h1>
        <LoginForm returnTo={returnTo} />
      </div>
    </main>
  );
}
