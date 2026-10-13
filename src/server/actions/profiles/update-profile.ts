"use server";

import { revalidatePath } from "next/cache";
import { requireSession, getUserRoles } from "@/server/auth/session";
import { upsertProfile } from "@/server/services/profiles";
import { redirect } from "next/navigation";
import { acceptPendingInvitations } from "@/server/actions/invitations/accept-invitation";
import { isStaffAccount } from "@/lib/auth/learner-profile-completion";

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
  // Enrolment is a server decision, not a hidden field supplied by one form.
  // A regular Profile save must finish onboarding too.
  if (!isStaffAccount(await getUserRoles(session.accessToken))) {
    const accepted = await acceptPendingInvitations();
    if (!accepted.ok) return { error: accepted.error === "email_unconfirmed"
      ? "Your profile is saved. Confirm your email address to open your invited course."
      : "Your profile is saved, but your invited course could not be opened yet. Please try saving again or contact your training administrator." };
    revalidatePath("/dashboard");
    revalidatePath("/catalogue");
    if (accepted.courseIds?.length || formData.get("complete_onboarding") === "true") {
      redirect("/dashboard?welcome=1");
    }
  }
  return { success: "Profile saved." };
}
