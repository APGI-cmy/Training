"use client";

import { useActionState, useState } from "react";
import { managePracticalRequest, savePracticalCase } from "@/server/actions/assessments/automated-practical";
import type { PracticalCaseRow, PracticalRequest } from "@/server/services/assessments/automated-practical";

export function ScannexRequestManager({ requests, cases }: { requests: PracticalRequest[]; cases: Pick<PracticalCaseRow, "id" | "title" | "status">[] }) {
  const [state, action, pending] = useActionState(managePracticalRequest, {});
  return <section className="admin-form-card"><h2>Readiness requests and access</h2>
    <p>Approve an access window of up to one day. Times below use South African time (UTC+02:00), wherever you are signing in.</p>
    <div className="directory-table-wrap"><table className="directory-table"><thead><tr><th>Learner</th><th>Preferred date</th><th>Status</th><th>Email notification</th></tr></thead><tbody>{requests.map(request => <tr key={request.id}><td>{request.learner_email}<small>{request.id}</small></td><td>{request.preferred_date}</td><td>{request.status}</td><td>{request.notification_status === "accepted" ? "Accepted by email provider" : request.notification_status}</td></tr>)}</tbody></table></div>
    {!requests.length ? <p>No learner readiness requests yet.</p> : <form action={action} className="form-stack">
      <label>Readiness request<select name="requestId" required defaultValue=""><option value="" disabled>Select a request</option>{requests.filter(r => !["completed", "cancelled", "expired"].includes(r.status)).map(r => <option key={r.id} value={r.id}>{r.learner_email} · {r.preferred_date} · {r.status}</option>)}</select></label>
      <label>Approved case<select name="caseId" defaultValue=""><option value="">Select a case for approval</option>{cases.filter(c => c.status === "approved").map(c => <option key={c.id} value={c.id}>{c.title} · {c.id.slice(0, 8)}</option>)}</select></label>
      <label>Access opens (South African time)<input type="datetime-local" name="opensAt" /></label>
      <label>Access closes (South African time)<input type="datetime-local" name="closesAt" /></label>
      <div className="button-row"><button className="primary-button" name="operation" value="approve" disabled={pending}>Approve access window</button><button className="secondary-button" name="operation" value="notify" disabled={pending}>Retry readiness email</button><button className="secondary-button" name="operation" value="cancel" disabled={pending}>Cancel request</button></div>
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.message ? <p role="status">{state.message}</p> : null}
    </form>}
  </section>;
}
export function ScannexCaseEditor({ cases, template }: { cases: PracticalCaseRow[]; template: string }) {
  const [state, action, pending] = useActionState(savePracticalCase, {});
  const [definition, setDefinition] = useState(template);
  return <section className="admin-form-card"><h2>Assessment case versions</h2>
    <p>Prepare a draft with the approved image references, learner instructions, checklist options and marking checks. Each save creates a new version. Existing attempts keep their assigned version and answer key.</p>
    <label>Start from a saved case<select defaultValue="" onChange={event => setDefinition(event.target.value ? JSON.stringify(cases.find(c => c.id === event.target.value)?.definition, null, 2) : template)}><option value="">New draft</option>{cases.map(c => <option key={c.id} value={c.id}>{c.title} · {c.status} · {c.id.slice(0, 8)}</option>)}</select></label>
    <form action={action} className="form-stack">
      <label>Case definition<textarea className="scannex-case-definition" name="definition" value={definition} onChange={event => setDefinition(event.target.value)} spellCheck={false} required /></label>
      <details><summary>Case definition guidance</summary><p>Image hashes identify the exact assigned files. Checklist options are visible to learners; expected answers and checks stay private. Each marking check awards a defined number of marks, totalling the maximum for its rubric item. Native checks require a validated collector field. Mark the required operational action checks as safetyCritical. The draft template contains placeholders and cannot be approved until completed.</p></details>
      <label className="checkbox-label"><input type="checkbox" name="approve" /> I have verified the case images, answer key, partial-credit rules and safety requirements, and approve this version for assignment.</label>
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}{state.message ? <p role="status">{state.message}</p> : null}
      <button className="primary-button" disabled={pending}>{pending ? "Saving…" : "Save new case version"}</button>
    </form>
  </section>;
}
