import "server-only";
import { createHmac } from "node:crypto";
import { adminRest } from "@/server/supabase/admin-rest";

export async function claimAuthEmailBudget(purpose: "recovery" | "signup", email: string): Promise<boolean> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("AUTH_EMAIL_NOT_CONFIGURED");
  const prefix = purpose === "recovery" ? "" : "signup:";
  for (const [key, limit] of [[`${prefix}email:${email}`, 3], [`${prefix}global`, 100]] as const) {
    const budget = await adminRest("/rest/v1/rpc/claim_password_recovery_budget", { method: "POST",
      body: JSON.stringify({ p_key: createHmac("sha256", serviceKey).update(key).digest("hex"), p_limit: limit }) });
    if (!budget.ok) throw new Error("AUTH_EMAIL_LIMIT_UNAVAILABLE");
    if ((await budget.json()) !== true) return false;
  }
  return true;
}
