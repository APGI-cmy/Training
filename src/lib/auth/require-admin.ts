import { requireRole } from "@/server/auth/session";

export async function requireAdmin() {
  return requireRole(["admin"]);
}
