import { getSupabaseRestUrl } from "@/server/auth/session";
import { adminRest } from "@/server/supabase/admin-rest";
import type { Organisation } from "@/lib/organisation";

type OrganisationRow = {
  id: string;
  slug: string;
  name: string;
  logo_path: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  pale_color: string;
  footer_text: string;
  default_referral_share_bps: number;
  is_active: boolean;
};

function logoUrl(logoPath: string | null) {
  return logoPath ? getSupabaseRestUrl(`/storage/v1/object/public/alp-branding-assets/${logoPath}`) : null;
}

function toOrganisation(row: OrganisationRow): Organisation {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    logoUrl: logoUrl(row.logo_path),
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    accentColor: row.accent_color,
    paleColor: row.pale_color,
    footerText: row.footer_text,
    defaultReferralShareBps: row.default_referral_share_bps,
    isActive: row.is_active,
  };
}

const selection = "id,slug,name,logo_path,primary_color,secondary_color,accent_color,pale_color,footer_text,default_referral_share_bps,is_active";

export async function getOrganisationsForAdmin(): Promise<Organisation[]> {
  try {
    const response = await adminRest(`/rest/v1/organisations?select=${selection}&order=name.asc`);
    if (!response.ok) return [];
    return ((await response.json()) as OrganisationRow[]).map(toOrganisation);
  } catch {
    return [];
  }
}

export async function getActiveOrganisations(): Promise<Organisation[]> {
  try {
    const response = await adminRest(`/rest/v1/organisations?is_active=eq.true&select=${selection}&order=name.asc`);
    if (!response.ok) return [];
    return ((await response.json()) as OrganisationRow[]).map(toOrganisation);
  } catch {
    return [];
  }
}

export async function getLearnerOrganisation(userId: string): Promise<Organisation | null> {
  try {
    const response = await adminRest(`/rest/v1/learner_organisations?user_id=eq.${encodeURIComponent(userId)}&select=organisation:organisations(${selection})&limit=1`);
    if (!response.ok) return null;
    const row = (await response.json()) as Array<{ organisation?: OrganisationRow | null }>;
    return row[0]?.organisation ? toOrganisation(row[0].organisation) : null;
  } catch {
    return null;
  }
}

export async function getAvailableCourseIds(userId: string, courseIds: string[]): Promise<Set<string>> {
  if (!courseIds.length) return new Set();
  const courseFilter = courseIds.map((courseId) => `"${courseId.replaceAll('"', '\\"')}"`).join(",");
  try {
    const [organisation, settingsResponse] = await Promise.all([
      getLearnerOrganisation(userId),
      adminRest(`/rest/v1/course_catalogue_settings?course_id=in.(${encodeURIComponent(courseFilter)})&select=course_id,visibility`),
    ]);
    if (!settingsResponse.ok) return new Set(courseIds);
    const settings = (await settingsResponse.json()) as Array<{ course_id: string; visibility: "public" | "client_specific" }>;
    const publicIds = new Set(settings.filter((setting) => setting.visibility === "public").map((setting) => setting.course_id));
    const configured = new Set(settings.map((setting) => setting.course_id));
    for (const courseId of courseIds) if (!configured.has(courseId)) publicIds.add(courseId);
    if (!organisation) return publicIds;
    const availabilityResponse = await adminRest(`/rest/v1/organisation_course_availability?organisation_id=eq.${encodeURIComponent(organisation.id)}&course_id=in.(${encodeURIComponent(courseFilter)})&select=course_id`);
    if (!availabilityResponse.ok) return publicIds;
    for (const row of (await availabilityResponse.json()) as Array<{ course_id: string }>) publicIds.add(row.course_id);
    return publicIds;
  } catch {
    return new Set(courseIds);
  }
}
