"use client";
import { useState } from "react";
import { policySignatories } from "@/lib/company-structure";
import { StructureForm } from "./StructureForm";
import { ReviewerFields } from "./ReviewerFields";
import { policyStructureAction } from "@/server/actions/platform-policies";

export function PolicyDraftForm({ companies, principalEmail }: {
  companies: { id: string; name: string }[]; principalEmail: string;
}) {
  const [company, setCompany] = useState("");
  return <StructureForm action={policyStructureAction} label="Save policy draft">
    <input type="hidden" name="operation" value="create" />
    <label title="Use the agreement name. Each course and company schedule should be recognisable.">Policy title<input title="Name of this policy or agreement." name="title" required minLength={3} maxLength={180} /></label>
    <label title="Create a new version when terms change. Previous decisions do not carry over.">Version label<input title="For example: Review draft 0.4." name="version_label" required placeholder="Review draft 0.1" maxLength={60} /></label>
    <label title="Internal agreements are restricted to the two platform principals. A partner agreement belongs to the selected company.">Company scope
      <select title="Choose internal governance or the company that must accept these terms." name="organisation_id" value={company} onChange={event => setCompany(event.target.value)}>
        <option value="">Confidential internal - two principals only</option>
        {companies.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}
      </select>
    </label>
    <ReviewerFields key={company ? "company" : "internal"} locked={!company} initialEmails={company ? [principalEmail, ""] : [...policySignatories]} />
    <label className="admin-span-two" title="Record the agreement terms or a summary referring to the attached PDF. Saving does not notify reviewers.">Summary and terms<textarea title="Agreement terms and reference to any attached PDF." name="body" required minLength={10} maxLength={40000} rows={6} /></label>
    <label title="Attach the exact review copy. Use a new policy version for later changes.">PDF document (optional)<input title="Private PDF, maximum 3 MB." type="file" name="pdf" accept="application/pdf" /><small>Private PDF, up to 3 MB. Submitted versions cannot be overwritten.</small></label>
  </StructureForm>;
}
