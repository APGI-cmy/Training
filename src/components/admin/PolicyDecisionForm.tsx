"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { policyStructureAction } from "@/server/actions/platform-policies";
import { POLICY_REASON_LIMIT } from "@/lib/policy-review";
import type { StructureState } from "@/lib/company-structure";

export function PolicyDecisionForm({ policyId, contentHash }: { policyId: string; contentHash: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [state, submit, pending] = useActionState<StructureState, FormData>(async (previous, form) => {
    try {
      const result = await policyStructureAction(previous, form);
      if (result.success) { window.dispatchEvent(new Event("alp-branding-updated")); router.refresh(); }
      return result;
    } catch {
      return { error: "The save could not be confirmed. Your decision and comments remain here. Check the saved reviews before retrying." };
    }
  }, {});
  return <form action={submit} className="admin-form-grid policy-decision-form">
    <input type="hidden" name="policy_id" value={policyId} />
    <input type="hidden" name="content_hash" value={contentHash} />
    <label>My decision
      <select name="operation" value={decision} onChange={event => setDecision(event.target.value)} required disabled={pending || !!state.success}>
        <option value="" disabled>Choose your decision</option>
        <option value="approve">Approve this version</option>
        <option value="reject">Reject and request changes</option>
      </select>
    </label>
    <label className="admin-span-two">Comments and proposed changes {decision === "reject" ? "(required)" : "(optional)"}
      <textarea name="reason" rows={10} value={reason} onChange={event => setReason(event.target.value)} required={decision === "reject"} minLength={decision === "reject" ? 3 : undefined} maxLength={POLICY_REASON_LIMIT} disabled={pending || !!state.success} aria-describedby="policy-reason-count" />
      <span id="policy-reason-count" className="field-hint">{reason.length.toLocaleString()} / {POLICY_REASON_LIMIT.toLocaleString()} characters. Your comments are retained if saving fails.</span>
    </label>
    <label className="admin-span-two policy-decision-confirm"><input type="checkbox" name="confirm_decision" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} required disabled={pending || !!state.success} /> I reviewed this exact version and confirm my selected decision.</label>
    <div className="admin-span-two" aria-live="polite">
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      {state.success ? <p className="form-success" role="status">{state.success}</p> : null}
      <button className="primary-button" disabled={pending || !!state.success}>{pending ? "Recording your decision…" : "Record my decision"}</button>
    </div>
  </form>;
}
