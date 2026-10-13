"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileActionState } from "@/server/actions/profiles/update-profile";
import type { AlpProfile } from "@/server/services/profiles";

const initialState: ProfileActionState = {};

export function ProfileForm({ profile, onboarding = false }: { profile: AlpProfile | null; onboarding?: boolean }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);

  return (
    <form className="alp-form" action={formAction}>
      {onboarding ? <input type="hidden" name="complete_onboarding" value="true" /> : null}
      <label>
        Full name
        <input name="full_name" defaultValue={profile?.full_name ?? ""} autoComplete="name" />
      </label>
      <label>
        Preferred name
        <input name="preferred_name" defaultValue={profile?.preferred_name ?? ""} />
      </label>
      <label>
        Certificate name
        <input name="certificate_name" defaultValue={profile?.certificate_name ?? ""} required />
      </label>
      <label>
        Phone
        <input name="phone" defaultValue={profile?.phone ?? ""} autoComplete="tel" />
      </label>
      <label>
        Country
        <input name="country" defaultValue={profile?.country ?? ""} autoComplete="country-name" />
      </label>
      {state.error ? <p className="feedback feedback-review" role="alert">{state.error}</p> : null}
      {state.success ? <>
        <p className="feedback feedback-correct">{state.success}</p>
      </> : null}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Saving..." : onboarding ? "Save profile and open dashboard" : "Save profile"}
      </button>
    </form>
  );
}
