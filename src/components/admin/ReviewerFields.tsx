"use client";
import "./commercial-planning.css";
import { useId, useRef, useState } from "react";

export function ReviewerFields({ initialEmails = ["", ""], locked = false }: {
  initialEmails?: string[]; locked?: boolean;
}) {
  const prefix = useId();
  const next = useRef(Math.max(2,initialEmails.length));
  const [rows, setRows] = useState(() => [...initialEmails,...Array(Math.max(0,2-initialEmails.length)).fill("")].map((email, id) => ({ email, id })));
  return <fieldset className="reviewer-fields">
    <legend>Required reviewers</legend>
    <p className="field-hint">{locked ? "Both internal signatories are included automatically. Their identities cannot be replaced here." : "Use one email address per reviewer. Include your APGI representative and the authorised company signatory."}</p>
    {rows.map((row, index) => <div className="reviewer-row" key={row.id}>
      <label htmlFor={`${prefix}-${row.id}`}>Reviewer {index + 1}
        <input id={`${prefix}-${row.id}`} name="reviewers" type="email" value={row.email}
          required readOnly={locked} maxLength={254} autoComplete="off"
          title="Enter one verified email address. This person must sign in with this address to decide."
          onChange={event => setRows(current => current.map(item => item.id === row.id ? { ...item, email: event.target.value } : item))} />
      </label>
      {!locked && rows.length > 2 ? <button type="button" className="text-button" aria-label={`Remove reviewer ${index + 1}`} onClick={() => setRows(current => current.filter(item => item.id !== row.id))}>Remove</button> : null}
    </div>)}
    {!locked ? <button type="button" className="secondary-button" disabled={rows.length >= 20} onClick={() => {
      const id = next.current++; setRows(current => [...current, { id, email: "" }]);
    }}>Add a reviewer</button> : null}
  </fieldset>;
}
