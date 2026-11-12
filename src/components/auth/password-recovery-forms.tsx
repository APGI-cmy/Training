"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordRecovery, updateRecoveredPassword, verifyRecoveryAuthenticator, type PasswordRecoveryState } from "@/server/actions/auth/password-recovery";

const initialState: PasswordRecoveryState = {};

export function ForgotPasswordForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(requestPasswordRecovery, initialState);
  return <form className="alp-form" action={action}>
    <input type="hidden" name="next" value={next} />
    <label>Email<input type="email" name="email" autoComplete="email" required maxLength={254} /></label>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    {state.message ? <div className="form-success" role="status">
      <p><strong>Next step: open your email</strong></p>
      <p>{state.message}</p>
      <p>This page stays here. Continue using the button in your newest account email, then return to sign in after setting your password.</p>
    </div> : null}
    <button className="primary-button" type="submit" disabled={pending}>{pending ? "Requesting email…" : "Send recovery or setup email"}</button>
    <Link href={`/alp-sign-in?next=${encodeURIComponent(next)}`}>Back to sign in</Link>
  </form>;
}

export function ResetPasswordForm({requestUrl = "/forgot-password"}: {requestUrl?: string}) {
  const [state, action, pending] = useActionState(updateRecoveredPassword, initialState);
  return <form className="alp-form" action={action}>
    <label>New password<input type="password" name="password" autoComplete="new-password" minLength={12} maxLength={256} required /></label>
    <label>Confirm new password<input type="password" name="confirmation" autoComplete="new-password" minLength={12} maxLength={256} required /></label>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    <button className="primary-button" type="submit" disabled={pending}>{pending ? "Saving password…" : "Save new password"}</button>
    <Link href={requestUrl}>Request a new recovery or setup email</Link>
  </form>;
}

export function RecoveryAuthenticatorForm({requestUrl}:{requestUrl:string}){
 const [state,action,pending]=useActionState(verifyRecoveryAuthenticator,initialState);
 return <form className="alp-form" action={action}><p>Your account has two-step verification. Enter your existing authenticator code before choosing a new password. This does not remove your authenticator or sign you into the platform.</p><label>Authenticator code<input type="text" name="code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required /></label>{state.error?<p className="form-error" role="alert">{state.error}</p>:null}<button className="primary-button" type="submit" disabled={pending}>{pending?'Verifying...':'Verify authenticator and continue'}</button><p>If you no longer have your authenticator, contact APGI support for a separate identity check.</p><Link href={requestUrl}>Request a fresh recovery email</Link></form>;
}
