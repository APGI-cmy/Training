import { OrganisationWorkspace } from "@/components/admin/OrganisationWorkspace";
import { getCourses } from "@/lib/courses";
import { getBrandingPresets } from "@/server/services/branding/course-branding";
import { getOrganisationsForAdmin } from "@/server/services/organisations/get-organisations";
import { adminRest } from "@/server/supabase/admin-rest";

export default async function OrganisationsPage() {
  const courses = getCourses().map(({ id, title }) => ({ id, title }));
  const [organisations, presets, settingsResponse, availabilityResponse] = await Promise.all([
    getOrganisationsForAdmin(), getBrandingPresets(),
    adminRest("/rest/v1/course_catalogue_settings?select=course_id,visibility"),
    adminRest("/rest/v1/organisation_course_availability?select=course_id,organisation_id"),
  ]);
  const settings = Object.fromEntries(settingsResponse.ok ? ((await settingsResponse.json()) as Array<{ course_id: string; visibility: "public" | "client_specific" }>).map((row) => [row.course_id, row.visibility]) : []);
  const availabilityRows = availabilityResponse.ok ? await availabilityResponse.json() as Array<{ course_id: string; organisation_id: string }> : [];
  const availability = availabilityRows.reduce<Record<string, string[]>>((result, row) => { (result[row.course_id] ??= []).push(row.organisation_id); return result; }, {});
  return <main className="admin-page"><header className="admin-page-header"><div><p className="eyebrow">Administration</p><h1>Organisations and branding</h1><p>Control learner identity, referral attribution and client-specific catalogue access.</p></div></header><OrganisationWorkspace organisations={organisations} presets={presets.map(({ id, brandName }) => ({ id, brandName }))} courses={courses} settings={settings} availability={availability} /></main>;
}
