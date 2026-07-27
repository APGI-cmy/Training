"use server";

import { redirect } from "next/navigation";
import { getPostSignInDestination } from "@/lib/auth/post-sign-in-destination";
import { getCurrentSession, getUserRoles, signInWithPassword, signOut } from "@/server/auth/session";

export type SignInState = {
  error?: string;
};

export async function signInAction(_state: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const result = await signInWithPassword(email, password);

  if (!result.ok) {
    return { error: result.error };
  }

  const session = await getCurrentSession();
  const roles = session ? await getUserRoles(session.accessToken) : [];
  redirect(getPostSignInDestination(roles));
}

export async function signOutAction() {
  await signOut();
  redirect("/alp-sign-in");
}
