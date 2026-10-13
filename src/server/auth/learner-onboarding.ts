import "server-only";
import { redirect } from "next/navigation";
import { getUserRoles, type AlpSession } from "@/server/auth/session";
import { getProfile } from "@/server/services/profiles";
import { isLearnerProfileComplete, isStaffAccount } from "@/lib/auth/learner-profile-completion";

export async function requireLearnerProfile(session: AlpSession, knownRoles?: readonly string[]) {
  const roles = knownRoles ?? await getUserRoles(session.accessToken);
  if (isStaffAccount(roles)) return;
  if (!isLearnerProfileComplete(await getProfile(session))) redirect("/profile?onboarding=required");
}
