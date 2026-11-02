"use server";

import { redirect } from "next/navigation";
import { getPortalEntryDestination } from "@/lib/auth/post-sign-in-destination";
import { getCurrentSession, getUserRoles, signInWithPassword, signOut } from "@/server/auth/session";
import { requireLearnerProfile } from "@/server/auth/learner-onboarding";
import {requiresAccountMfa} from '@/server/auth/session-assurance';

export type SignInState = {
  error?: string;
};

function safeReturnTo(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return value;
}

export async function signInAction(_state: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const returnTo = safeReturnTo(String(formData.get("returnTo") ?? ""));

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const result = await signInWithPassword(email, password);

  if (!result.ok) {
    return { error: result.error };
  }

  const session = await getCurrentSession({allowMfaChallenge:true});

  if (!session) {
    redirect("/alp-sign-in");
  }
  if(requiresAccountMfa(session.accessToken,session.user.id,session.user.factors))redirect('/account-security?verify=1');

  const roles = await getUserRoles(session.accessToken);
  await requireLearnerProfile(session, roles);
  redirect(returnTo ?? getPortalEntryDestination(roles));
}

export async function signOutAction() {
  await signOut();
  redirect("/alp-sign-in");
}
