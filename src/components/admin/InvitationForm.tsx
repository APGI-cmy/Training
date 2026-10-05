"use client";

import { useActionState } from "react";
import { createInvitationWithState, type CreateInvitationState } from "@/server/actions/invitations/create-invitation";

const initialState: CreateInvitationState = { ok: false };

export function InvitationForm({
  courses,
  organisations,
  defaultExpiry
}: {
  courses: Array<{ id: string; title: string }>;
  organisations: Array<{ id: string; name: string }>;
  defaultExpiry: string;
}) {
  const [state, action, pending] = useActionState(createInvitationWithState, initialState);
  const deliveryStatus = state.deliveryStatus ?? "created_not_sent";

  return (
    <>
      <form action={action} className="admin-form-card invitation-form">
        <div className="admin-card-heading invitation-form-heading">
          <div>
            <p className="eyebrow">Individual invitation</p>
            <h2>Invitation details</h2>
          </div>
        </div>
        <p className="form-guidance">Choose the learner, the courses to enrol them in and the organisation profile that will shape their catalogue access.</p>

        <div className="admin-form-grid invitation-form-grid">
          <label className="admin-span-two">
            <span>Learner email</span>
            <input name="recipientEmail" type="email" required />
          </label>
          <label className="admin-span-two">
            <span>Initial course enrolments</span>
            <select name="courseIds" required multiple size={Math.min(4, Math.max(2, courses.length))}>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
            <span className="field-hint">Select one or more courses to issue with this invitation. The learner’s organisation also determines any client-only courses visible in their catalogue.</span>
          </label>
          <label>
            <span>Organisation profile</span>
            <select name="organisationId" required defaultValue="">
              <option value="" disabled>Select the learner's organisation</option>
              {organisations.map((organisation) => <option key={organisation.id} value={organisation.id}>{organisation.name}</option>)}
            </select>
          </label>
          <label>
            <span>Access basis</span>
            <select name="basis" required>
              <option value="external_payment">External payment</option>
              <option value="corporate_order">Corporate order</option>
              <option value="complimentary_marketing">Complimentary marketing</option>
              <option value="internal_allocation">Internal allocation</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="admin-span-two">
            <span>Reason</span>
            <textarea name="reason" required />
          </label>

          <div className="invitation-form-meta admin-span-two">
            <label>
              <span>Reference</span>
              <input name="reference" placeholder="Order, PO or internal reference" />
            </label>
            <label>
              <span>Company</span>
              <input name="company" placeholder="Organisation name" />
            </label>
            <label>
              <span>Expires at</span>
              <input name="expiresAt" type="datetime-local" defaultValue={defaultExpiry} required />
            </label>
          </div>
        </div>

        <div className="invitation-form-actions">
          <button className="primary-button" type="submit" disabled={pending}>{pending ? "Creating…" : "Create invitation"}</button>
        </div>
      </form>

      {state.error ? <p role="alert">Invitation could not be created: {state.error}</p> : null}
      {state.ok ? (
        <section className="notice-card" aria-live="polite">
          <h3>{deliveryStatus === "sent" ? "Invitation email accepted" : "Invitation created"}</h3>
          <p>
            {deliveryStatus === "sent"
              ? "The email provider accepted the invitation for delivery. The learner must accept the single-use, expiring link using the invited email address."
              : "Email delivery has not been confirmed. Check the invitation status before asking the learner to look for the email."}
          </p>
        </section>
      ) : null}
    </>
  );
}
