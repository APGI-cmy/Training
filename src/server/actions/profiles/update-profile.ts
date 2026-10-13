"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth/session";
import { upsertProfile } from "@/server/services/profiles";
import { redirect } from "next/navigation";
import { acceptPendingInvitations } from "@/server/actions/invitations/accept-invitation";

export type ProfileActionState = {
  error?: string;
  success?: string;
};

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

export async function updateProfileAction(
  _state: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const session = await requireSession();

  const certificateName = clean(formData.get("certificate_name"));

  if (!certificateName) {
    return { error: "Certificate name is required for APGI learner records." };
  }

  const result = await upsertProfile(session, {
    full_name: clean(formData.get("full_name")),
    preferred_name: clean(formData.get("preferred_name")),
    certificate_name: certificateName,
    phone: clean(formData.get("phone")),
    country: clean(formData.get("country"))
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/profile");
  if (formData.get("complete_onboarding") === "true") {
    const accepted = await acceptPendingInvitations();
    if (!accepted.ok) return { error: accepted.error === "email_unconfirmed"
      ? "Your profile is saved. Confirm your email address before accepting your course invitation."
      : "Your profile is saved, but your course invitation could not be accepted. Please try saving again or contact your training administrator." };
    revalidatePath("/dashboard");
    revalidatePath("/catalogue");
    redirect("/dashboard?welcome=1");
  }
  return { success: "Profile saved." };
}
