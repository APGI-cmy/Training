"use server";

import { redirect } from "next/navigation";
import { signInWithPassword } from "@/server/auth/session";

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

  redirect("/profile");
}
