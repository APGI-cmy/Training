"use client";
import { useActionState, useState } from "react";
import { createInvitationWithState, type CreateInvitationState } from "@/server/actions/invitations/create-invitation";
export function InvitationForm({ courses, organisations, defaultExpiry, groups = [] }: {
  courses: Array<{ id: string; title: string }>; organisations: Array<{ id: string; name: string }>;
  defaultExpiry: string; groups?: Array<{ id: string; name: string; organisation_id: string }>;
}) {
  const [state, action, pending] = useActionState(createInvitationWithState, { ok: false } as CreateInvitationState);
  const [role, setRole] = useState("learner");
  const [organisationId, setOrganisationId] = useState("");
  const deliveryStatus = state.deliveryStatus ?? "created_not_sent";
  return <form action={action} className="admin-form-card invitation-form">
    <div className="admin-card-heading"><div><p className="eyebrow">Individual invitation</p><h2>Invite a learner or administrator</h2></div></div>
    <div className="admin-form-grid invitation-form-grid">
      <label><span>Platform role</span><select name="role" value={role} onChange={e => setRole(e.target.value)}><option value="learner">Learner</option><option value="admin">Administrator</option></select></label>
      <label><span>Invited email</span><input name="recipientEmail" type="email" required /></label>
      <label><span>Organisation</span><select name="organisationId" required value={organisationId} onChange={e => setOrganisationId(e.target.value)}><option value="" disabled>Select an organisation</option>{organisations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
      {role === "learner" ? <>
        <label><span>Learner group</span><select name="groupId" key={organisationId} defaultValue=""><option value="">Individual learner (no group)</option>{groups.filter(g => g.organisation_id === organisationId).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
        <label className="admin-span-two"><span>Initial course enrolments</span><select name="courseIds" required multiple size={Math.min(4, Math.max(2, courses.length))}>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select><span className="field-hint">Select one or more courses. Saving the matching learner profile activates these invitations.</span></label>
        <label><span>Access basis</span><select name="basis"><option value="external_payment">External payment</option><option value="corporate_order">Corporate order</option><option value="complimentary_marketing">Complimentary marketing</option><option value="internal_allocation">Internal allocation</option><option value="other">Other</option></select></label>
      </> : <label className="admin-span-two"><input name="confirmAdminAccess" type="checkbox" required /> I authorise full platform administrator access, including learner records and access management.</label>}
      <label><span>Expires at</span><input name="expiresAt" type="datetime-local" defaultValue={defaultExpiry} required /></label>
      <label className="admin-span-two"><span>Reason</span><textarea name="reason" required /></label>
      <label><span>Reference</span><input name="reference" /></label><label><span>Company</span><input name="company" /></label>
    </div>
    <button className="primary-button" disabled={pending}>{pending ? "Creating…" : "Create invitation"}</button>
    {state.error ? <p role="alert" className="form-error">Invitation could not be created: {state.error}</p> : null}
    {state.ok ? <div className="notice-card" role="status"><strong>Invitation created</strong>{state.invitationUrl ? <><p>Staging: no email was sent. Open this link using the invited test account.</p><a href={state.invitationUrl} target="_blank" rel="noopener noreferrer">Open test invitation</a><input aria-label="Test invitation link" readOnly value={state.invitationUrl} /></> : <p>{deliveryStatus === 'sent' ? 'The email provider accepted the invitation.' : 'Email delivery has not been confirmed.'}</p>}</div> : null}
  </form>;
}
