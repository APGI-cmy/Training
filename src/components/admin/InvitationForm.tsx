"use client";

import { useActionState } from "react";
import { createInvitationWithState, type CreateInvitationState } from "@/server/actions/invitations/create-invitation";

const initialState: CreateInvitationState = { ok: false };

export function InvitationForm({
  courses,
  defaultExpiry
}: {
  courses: Array<{ id: string; title: string }>;
  defaultExpiry: string;
}) {
  const [state, action, pending] = useActionState(createInvitationWithState, initialState);

  return (
    <>
      <form action={action} className="form-stack">
        <label>
          Learner email
          <input name="recipientEmail" type="email" required />
        </label>
        <label>
          Course
          <select name="courseId" required>
            {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
          </select>
        </label>
        <label>
          Access basis
          <select name="basis" required>
            <option value="external_payment">External payment</option>
            <option value="corporate_order">Corporate order</option>
            <option value="complimentary_marketing">Complimentary marketing</option>
            <option value="internal_allocation">Internal allocation</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Reason
          <textarea name="reason" required />
        </label>
        <label>
          Reference
          <input name="reference" />
        </label>
        <label>
          Company
          <input name="company" />
        </label>
        <label>
          Expires at
          <input name="expiresAt" type="datetime-local" defaultValue={defaultExpiry} required />
        </label>
        <button type="submit" disabled={pending}>{pending ? "Creating…" : "Create invitation"}</button>
      </form>

      {state.error ? <p role="alert">Invitation could not be created: {state.error}</p> : null}
      {state.ok && state.token ? (
        <section className="notice-card" aria-live="polite">
          <h3>Invitation created</h3>
          <p>
            Delivery status: <strong>{state.deliveryStatus ?? "created_not_sent"}</strong>. Copy this one-time
            invitation path now; no email has been sent from this system.
          </p>
          <code>{`/invitations/${state.token}`}</code>
        </section>
      ) : null}
    </>
  );
}
