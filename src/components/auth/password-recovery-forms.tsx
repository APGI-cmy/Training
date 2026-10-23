"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordRecovery, updateRecoveredPassword, type PasswordRecoveryState } from "@/server/actions/auth/password-recovery";

const initialState: PasswordRecoveryState = {};

export function ForgotPasswordForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(requestPasswordRecovery, initialState);
  return <form className="alp-form" action={action}>
    <input type="hidden" name="next" value={next} />
    <label>Email<input type="email" name="email" autoComplete="email" required maxLength={254} /></label>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    {state.message ? <p className="form-success" role="status">{state.message}</p> : null}
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
