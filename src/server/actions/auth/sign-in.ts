"use server";

import { redirect } from "next/navigation";
import { getPortalEntryDestination } from "@/lib/auth/post-sign-in-destination";
import { getCurrentSession, getUserRoles, signInWithPassword, signOut } from "@/server/auth/session";

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

  const session = await getCurrentSession();

  if (!session) {
    redirect("/alp-sign-in");
  }

  const roles = await getUserRoles(session.accessToken);
  redirect(returnTo ?? getPortalEntryDestination(roles));
}

export async function signOutAction() {
  await signOut();
  redirect("/alp-sign-in");
}
