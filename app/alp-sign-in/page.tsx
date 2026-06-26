import { LoginForm } from "@/components/auth/login-form";

export default function AlpSignInPage() {
  return (
    <main className="content-band">
      <div className="content-inner auth-panel">
        <h1>APGI sign in</h1>
        <LoginForm />
      </div>
    </main>
  );
}
