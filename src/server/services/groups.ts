import "server-only";
import { adminRest } from "@/server/supabase/admin-rest";
export type LearnerGroup = { id: string; name: string; organisation_id: string };
export async function getGroups(): Promise<LearnerGroup[]> {
  const r = await adminRest("/rest/v1/learner_groups?select=id,name,organisation_id&order=name.asc");
  if (!r.ok) throw new Error("GROUPS_UNAVAILABLE");
  return r.json();
}
export async function validGroup(groupId?: string, organisationId?: string) {
  if (!groupId) return true;
  return (await getGroups()).some(g => g.id === groupId && g.organisation_id === organisationId);
}
