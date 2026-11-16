import "server-only";
import { adminRest } from "@/server/supabase/admin-rest";
import { requireSession, getUserRoles, type AlpSession } from "@/server/auth/session";

export async function isPlatformPrincipal(session?: AlpSession): Promise<boolean> {
  const current = session ?? await requireSession();
  if (!current.user.email_confirmed_at || !(await getUserRoles(current.accessToken)).includes("admin")) return false;
  const response = await adminRest("/rest/v1/rpc/v2_is_platform_principal", {
    method: "POST",
    body: JSON.stringify({ p_actor: current.user.id }),
  });
  if (!response.ok) throw new Error("Principal access could not be verified.");
  return (await response.json()) === true;
}

export async function requirePlatformPrincipal() {
  const session = await requireSession();
  if (!(await isPlatformPrincipal(session)))
    throw new Error("This area is restricted to the two platform principals.");
  return { session, isAdmin: true };
}
