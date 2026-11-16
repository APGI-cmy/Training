"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getCourseBySlug, getCourses } from "@/lib/courses";
import { adminRest } from "@/server/supabase/admin-rest";

export type OrganisationFormState = { success?: string; error?: string };

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function createOrganisation(_previousState: OrganisationFormState, formData: FormData): Promise<OrganisationFormState> {
  const { session } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const presetId = String(formData.get("brandingPresetId") ?? "").trim();
  const referralPercent = Number(formData.get("referralPercent") ?? "10");
  const slug = slugify(name);
  if (!name || !slug || !Number.isFinite(referralPercent) || referralPercent < 0 || referralPercent > 100) return { error: "Enter an organisation name and a referral percentage from 0 to 100." };

  let branding: Record<string, unknown> = {};
  if (presetId) {
    const presetResponse = await adminRest(`/rest/v1/branding_presets?id=eq.${encodeURIComponent(presetId)}&select=name,logo_path,primary_color,secondary_color,accent_color,pale_color,footer_text&limit=1`);
    if (!presetResponse.ok) return { error: "The selected saved branding could not be found." };
    const preset = (await presetResponse.json()) as Array<Record<string, unknown>>;
    if (!preset[0]) return { error: "The selected saved branding could not be found." };
    branding = {
      logo_path: preset[0].logo_path,
      primary_color: preset[0].primary_color,
      secondary_color: preset[0].secondary_color,
      accent_color: preset[0].accent_color,
      pale_color: preset[0].pale_color,
      footer_text: preset[0].footer_text,
    };
  }
  const response = await adminRest("/rest/v1/organisations?on_conflict=slug", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ slug, name, default_referral_share_bps: Math.round(referralPercent * 100), ...branding })
  });
  if (!response.ok) return { error: "The organisation could not be saved." };
  const organisation = (await response.json()) as Array<{ id?: string }>;
  if (!organisation[0]?.id) return { error: "The organisation could not be saved." };

  revalidatePath("/admin/organisations");
  revalidatePath("/admin/invitations");
  return { success: `${name} is ready for learner invitations.` };
}

export async function saveCourseCatalogueVisibility(_previousState: OrganisationFormState, formData: FormData): Promise<OrganisationFormState> {
  const { session } = await requireAdmin();
  const courseId = String(formData.get("courseId") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "").trim();
  const organisationIds = formData.getAll("organisationIds").map(String).filter(Boolean);
  if (!getCourseBySlug(courseId) || !["public", "client_specific"].includes(visibility)) return { error: "Choose a valid course visibility." };
  if (visibility === "client_specific" && !organisationIds.length) return { error: "Select at least one organisation for a client-specific course." };
  const organisationResponse = await adminRest(`/rest/v1/organisations?id=in.(${encodeURIComponent(organisationIds.map((id) => `\"${id}\"`).join(","))})&is_active=eq.true&select=id`);
  if (visibility === "client_specific" && (!organisationResponse.ok || ((await organisationResponse.json()) as Array<{ id: string }>).length !== organisationIds.length)) return { error: "One or more selected organisations are no longer active." };

  const setting = await adminRest("/rest/v1/course_catalogue_settings?on_conflict=course_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ course_id: courseId, visibility, updated_by: session.user.id })
  });
  if (!setting.ok) return { error: "Course visibility could not be saved." };
  const clear = await adminRest(`/rest/v1/organisation_course_availability?course_id=eq.${encodeURIComponent(courseId)}`, { method: "DELETE" });
  if (!clear.ok) return { error: "Course visibility could not be saved." };
  if (visibility === "client_specific") {
    const add = await adminRest("/rest/v1/organisation_course_availability", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(organisationIds.map((organisationId) => ({ organisation_id: organisationId, course_id: courseId })))
    });
    if (!add.ok) return { error: "Course visibility could not be saved." };
  }
  revalidatePath("/catalogue");
  revalidatePath("/admin/organisations");
  return { success: `${getCourses().find((course) => course.id === courseId)?.title ?? "Course"} availability saved.` };
}
