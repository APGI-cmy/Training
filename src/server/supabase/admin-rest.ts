import "server-only";
import { getSupabaseRestUrl } from "@/server/auth/session";

export async function adminRest(path: string, init: RequestInit = {}) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = getSupabaseRestUrl(path);

  if (!serviceRoleKey || !url) {
    throw new Error("SUPABASE_ADMIN_NOT_CONFIGURED");
  }

  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  headers.set("apikey", serviceRoleKey);
  headers.set("authorization", `Bearer ${serviceRoleKey}`);

  return fetch(url, {
    ...init,
    headers,
    cache: "no-store"
  });
}
