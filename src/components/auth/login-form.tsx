"use client";

import { useActionState } from "react";
import { signInAction, type SignInState } from "@/server/actions/auth/sign-in";

const initialState: SignInState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form className="alp-form" action={formAction}>
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {state.error ? <p className="feedback feedback-review">{state.error}</p> : null}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
