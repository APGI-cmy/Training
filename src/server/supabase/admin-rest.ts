import "server-only";
import { getSupabaseRestUrl } from "@/server/auth/session";

export async function adminRest(path: string, init: RequestInit = {}) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = getSupabaseRestUrl(path);

  if (!serviceRoleKey || !url) {
    throw new Error("SUPABASE_ADMIN_NOT_CONFIGURED");
  }

  return fetch(url, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });
}
