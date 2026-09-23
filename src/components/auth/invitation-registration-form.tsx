"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerInvitedUser, type InvitationRegistrationState } from "@/server/actions/auth/register-invited-user";

const initialState: InvitationRegistrationState = {};

export function InvitationRegistrationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(registerInvitedUser, initialState);

  if (state.continueUrl) {
    return <section className="state-card">
      <p className="feedback feedback-correct" role="status">{state.message}</p>
      <Link className="primary-button" href={state.continueUrl}>Continue to sign in and accept invitation</Link>
    </section>;
  }

  return <form className="alp-form" action={action}>
    <input name="token" type="hidden" value={token} />
    <label>Email<input name="email" type="email" autoComplete="email" required /></label>
    <label>Choose a password<input name="password" type="password" autoComplete="new-password" minLength={12} required /></label>
    {state.error ? <p className="feedback feedback-review" role="alert">{state.error}</p> : null}
    {state.message ? <p className="feedback feedback-correct" role="status">{state.message}</p> : null}
    <button className="primary-button" type="submit" disabled={pending}>{pending ? "Creating account…" : "Create APGI account"}</button>
  </form>;
}
