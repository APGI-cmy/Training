import Link from "next/link";
import type { PolicyRecord } from "@/lib/company-structure";
import { policyDecisionLabel, type PolicyDecision } from "@/lib/policy-review";
import type { PolicyAuditEvent } from "@/server/services/policy-history";

export const policyTime = (at: string) => `${new Date(at).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })} SAST`;
export function PolicySavedResponse({ decision }: { decision: PolicyDecision }) {
  return <div className="policy-saved-response">
    <p><strong>{decision.email}</strong> — {policyDecisionLabel(decision.decision)} · {policyTime(decision.decided_at)}</p>
    {decision.reason ? <><strong>Saved comments and proposed changes</strong><p className="policy-body">{decision.reason}</p></> : <p>No additional comments were submitted.</p>}
  </div>;
}
const eventNames: Record<string,string> = {policy_draft_created:"Draft created",policy_submit:"Submitted for independent review",policy_approve:"Approval recorded",policy_reject:"Rejection and proposed changes recorded",policy_decision_recovered:"Earlier failed response recovered with the reviewer's authority",policy_revision_prepared:"Revision prepared from saved review feedback"};
export function PolicyReviewHistory({ versions, decisions, events }: { versions: PolicyRecord[]; decisions: (PolicyDecision & {policy_id:string})[]; events: PolicyAuditEvent[] }) {
  return <section className="admin-form-card" id="policy-history"><h2>Policy audit trail and earlier versions</h2>
    <p>Decisions belong to the exact version reviewed. A new version does not erase a rejection or carry an approval forward.</p>
    {versions.map(version => <details key={version.id} className="review-box" open={versions.length === 1}>
      <summary><strong>{version.version_label}</strong> · {version.status} · {policyTime(version.created_at)}</summary>
      <p><Link href={`/policies/${version.id}#required-reviews`}>Open this document and its decisions</Link></p>
      {decisions.filter(d=>d.policy_id===version.id && d.content_hash===version.content_hash).map(d=><PolicySavedResponse key={d.email} decision={d}/>)}
      {!decisions.some(d=>d.policy_id===version.id)?<p>No reviewer decisions recorded for this version.</p>:null}
      <ol>{events.filter(e=>e.subject_id===version.id).map(event=><li key={event.id}>
        <strong>{eventNames[event.event_type] ?? event.event_type.replaceAll("_"," ")}</strong> · {policyTime(event.occurred_at)}
        {event.detail.capture_method?<p>{event.detail.capture_method}</p>:null}
      </li>)}</ol>
    </details>)}
  </section>;
}
