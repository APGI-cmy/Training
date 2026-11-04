import type { PolicyRecord } from "./company-structure";
import type { PersonalNotification } from "./notifications";

export const POLICY_REASON_LIMIT = 20000;
export type PolicyDecision = { email: string; decision: string; reason: string; decided_at: string; content_hash: string };
export function policyDecisionLabel(decision: string) { return decision === "reject" ? "Rejected — changes requested" : "Approved this version"; }
export function policyReviewerStatus(policy: Pick<PolicyRecord, "status">, decision?: PolicyDecision) {
  return decision ? policyDecisionLabel(decision.decision) : policy.status === "rejected" ? "No decision required — a revised version is needed" : "Awaiting decision";
}
export function presentPolicyNotification(n: PersonalNotification, policy: Pick<PolicyRecord, "id" | "title" | "status" | "content_hash">, decisions: PolicyDecision[], email: string): PersonalNotification {
  const own = decisions.find(d => d.email === email.toLowerCase() && d.content_hash === policy.content_hash);
  const closed = policy.status !== "submitted" || !!own;
  const result = { ...n, target_path: `/policies/${policy.id}`, pending: n.response_type === "action" && closed ? false : n.pending };
  if (policy.status === "rejected") {
    result.message = `Policy rejected — revision required: ${policy.title}`;
    result.requirement = `${own?.decision === "reject" ? "Your rejection and proposed changes are recorded." : "A required reviewer rejected this version and requested changes."} Read the saved review response. This version is not approved and no further approval is required on it. A revised version must be submitted for fresh decisions.`;
  } else if (own) {
    result.message = `Your policy decision is recorded: ${policy.title}`;
    result.requirement = `${policyDecisionLabel(own.decision)}.${policy.status === "submitted" ? " Waiting for the remaining required reviewer decisions." : " All required approvals are recorded."} Your saved comments are available in Required reviews. No further decision is required from you on this version.`;
  } else if (policy.status === "approved") {
    result.message = `Policy approved: ${policy.title}`;
    result.requirement = "The required decisions are recorded. Open the policy to read the saved reviews. This notification does not activate financial terms or authorise a payout.";
  }
  return result;
}
