import "server-only";
import { requirePolicy, rows } from "./company-structure";
import type { PolicyRecord } from "@/lib/company-structure";
import type { PolicyDecision } from "@/lib/policy-review";

export type PolicyAuditEvent = { id: string; subject_id: string; event_type: string; actor_id: string; occurred_at: string; detail: { reason?: string; capture_method?: string } };
export async function policyHistory(id: string) {
  const access = await requirePolicy(id);
  const versions: PolicyRecord[] = [access.policy];
  const seen = new Set([id]);
  // Follow explicit version links only; never infer relationships from document titles.
  while (versions[0].previous_version_id && versions.length < 50) {
    const previous = versions[0].previous_version_id;
    if (seen.has(previous)) throw Error("The policy version history contains a cycle.");
    const item = await requirePolicy(previous);
    versions.unshift(item.policy);
    seen.add(previous);
  }
  if (versions[0].previous_version_id) throw Error("The policy history is too long to display safely.");
  const ids = versions.map(p => p.id).join(",");
  const [decisions, events, replacements] = await Promise.all([
    rows<(PolicyDecision & { policy_id: string })>(`/rest/v1/policy_decisions?policy_id=in.(${ids})&select=policy_id,email,decision,reason,decided_at,content_hash&order=decided_at.asc`),
    rows<PolicyAuditEvent>(`/rest/v1/governance_events?subject_id=in.(${ids})&select=id,subject_id,event_type,actor_id,occurred_at,detail&order=occurred_at.asc`),
    rows<PolicyRecord>(`/rest/v1/platform_policy_versions?previous_version_id=eq.${id}&status=neq.draft&select=*&order=created_at.desc&limit=1`),
  ]);
  // Confirm access to a successor before exposing a link or its status.
  const replacement = replacements[0] ? (await requirePolicy(replacements[0].id)).policy : undefined;
  return { ...access, versions, decisions, events, replacement };
}
