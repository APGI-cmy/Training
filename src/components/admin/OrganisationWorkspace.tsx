"use client";

import { useActionState } from "react";
import type { Organisation } from "@/lib/organisation";
import { formatShareBps } from "@/lib/organisation";
import { createOrganisation, saveCourseCatalogueVisibility, type OrganisationFormState } from "@/server/actions/organisations/manage-organisations";

const initialState: OrganisationFormState = {};

export function OrganisationWorkspace({ organisations, presets, courses, settings, availability }: {
  organisations: Organisation[];
  presets: Array<{ id: string; brandName: string }>;
  courses: Array<{ id: string; title: string }>;
  settings: Record<string, "public" | "client_specific">;
  availability: Record<string, string[]>;
}) {
  const [createState, createAction, creating] = useActionState(createOrganisation, initialState);
  return <div className="admin-workspace-grid">
    <section className="admin-form-card">
      <div className="admin-card-heading"><div><p className="eyebrow">Organisation identity</p><h2>Create an organisation profile</h2></div></div>
      <p>The first invitation accepted by a learner establishes their permanent organisation and referral relationship.</p>
      <form action={createAction} className="form-stack">
        <label>Organisation name<input name="name" required placeholder="Example: NKS Capital" /></label>
        <label>Saved branding<select name="brandingPresetId" defaultValue=""><option value="">Use APGI branding for now</option>{presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.brandName}</option>)}</select></label>
        <label>Default referral commission (%)<input name="referralPercent" type="number" min="0" max="100" step="0.01" defaultValue="10" required /></label>
        {createState.error ? <p className="form-error" role="alert">{createState.error}</p> : null}
        {createState.success ? <p className="form-success">{createState.success}</p> : null}
        <button className="primary-button" disabled={creating}>{creating ? "Saving…" : "Save organisation"}</button>
      </form>
    </section>
    <section className="admin-side-card"><p className="eyebrow">Active organisation profiles</p><h2>Branding and referral attribution</h2>{organisations.map((organisation) => <div className="draft-summary" key={organisation.id}><strong>{organisation.name}</strong><span>{organisation.slug} · default referral {formatShareBps(organisation.defaultReferralShareBps)}</span></div>)}</section>
    <section className="admin-form-card admin-span-two"><div className="admin-card-heading"><div><p className="eyebrow">Catalogue access</p><h2>Set each course as public or client-specific</h2></div></div>{courses.map((course) => <CourseAvailabilityForm key={course.id} course={course} organisations={organisations} visibility={settings[course.id] ?? "public"} organisationIds={availability[course.id] ?? []} />)}</section>
  </div>;
}

function CourseAvailabilityForm({ course, organisations, visibility, organisationIds }: { course: { id: string; title: string }; organisations: Organisation[]; visibility: "public" | "client_specific"; organisationIds: string[] }) {
  const [state, action, pending] = useActionState(saveCourseCatalogueVisibility, initialState);
  return <form action={action} className="draft-summary"><input type="hidden" name="courseId" value={course.id} /><strong>{course.title}</strong><label>Availability<select name="visibility" defaultValue={visibility}><option value="public">Public — all learners can see and purchase</option><option value="client_specific">Client-specific — selected organisations only</option></select></label><fieldset><legend>Eligible organisations</legend>{organisations.filter((organisation) => organisation.slug !== "apgi").map((organisation) => <label className="check-row" key={organisation.id}><input type="checkbox" name="organisationIds" value={organisation.id} defaultChecked={organisationIds.includes(organisation.id)} />{organisation.name}</label>)}</fieldset>{state.error ? <p className="form-error">{state.error}</p> : null}{state.success ? <p className="form-success">{state.success}</p> : null}<button className="secondary-button" disabled={pending}>{pending ? "Saving…" : "Save availability"}</button></form>;
}
