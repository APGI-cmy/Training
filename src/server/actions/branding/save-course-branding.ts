"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { isBrandColor } from "@/lib/branding";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getCourseBySlug } from "@/lib/courses";
import { getSupabaseRestUrl } from "@/server/auth/session";
import { adminRest } from "@/server/supabase/admin-rest";

export type CourseBrandingFormState = { error?: string; success?: string };

const allowedLogoTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function saveBrandingPreset(input: {
  presetId?: string;
  name: string;
  logoPath: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  paleColor: string;
  footerText: string;
  userId: string;
}) {
  const body = {
    name: input.name,
    logo_path: input.logoPath,
    primary_color: input.primaryColor,
    secondary_color: input.secondaryColor,
    accent_color: input.accentColor,
    pale_color: input.paleColor,
    footer_text: input.footerText,
    updated_by: input.userId,
    updated_at: new Date().toISOString(),
  };
  const path = input.presetId
    ? `/rest/v1/branding_presets?id=eq.${encodeURIComponent(input.presetId)}`
    : "/rest/v1/branding_presets?on_conflict=name";
  const response = await adminRest(path, {
    method: input.presetId ? "PATCH" : "POST",
    headers: { Prefer: input.presetId ? "return=minimal" : "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(body),
  });
  return response.ok;
}

export async function saveCourseBranding(
  _previous: CourseBrandingFormState,
  formData: FormData,
): Promise<CourseBrandingFormState> {
  const { session } = await requireAdmin();
  const courseId = value(formData, "course_id");
  const course = getCourseBySlug(courseId);
  if (!course) return { error: "Choose a valid course." };

  const brandName = value(formData, "brand_name");
  const footerText = value(formData, "footer_text");
  const colors = {
    primary: value(formData, "primary_color"),
    secondary: value(formData, "secondary_color"),
    accent: value(formData, "accent_color"),
    pale: value(formData, "pale_color"),
  };

  if (brandName.length < 2 || brandName.length > 120) {
    return { error: "Enter a client brand name between 2 and 120 characters." };
  }
  if (footerText.length < 2 || footerText.length > 160) {
    return { error: "Enter footer attribution between 2 and 160 characters." };
  }
  if (!Object.values(colors).every(isBrandColor)) {
    return { error: "Each colour must be a full six-digit hex value." };
  }

  let logoPath = value(formData, "existing_logo_path") || null;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const extension = allowedLogoTypes.get(logo.type);
    if (!extension || logo.size > 2 * 1024 * 1024) {
      return { error: "Use a PNG, JPEG, or WebP logo no larger than 2 MB." };
    }

    const objectPath = `courses/${courseId}/${randomUUID()}.${extension}`;
    const uploadUrl = getSupabaseRestUrl(`/storage/v1/object/alp-branding-assets/${objectPath}`);
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!uploadUrl || !serviceRoleKey) return { error: "Branding storage is not configured." };

    const upload = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": logo.type,
        "x-upsert": "true",
      },
      body: logo,
      cache: "no-store",
    });
    if (!upload.ok) return { error: "The client logo could not be uploaded." };
    logoPath = objectPath;
  }

  const response = await adminRest("/rest/v1/course_branding?on_conflict=course_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      course_id: courseId,
      brand_name: brandName,
      logo_path: logoPath,
      primary_color: colors.primary,
      secondary_color: colors.secondary,
      accent_color: colors.accent,
      pale_color: colors.pale,
      footer_text: footerText,
      is_active: formData.get("is_active") === "on",
      updated_by: session.user.id,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) return { error: "Branding could not be saved. Confirm the branding database migration is live." };

  const presetSaved = await saveBrandingPreset({
    presetId: value(formData, "preset_id") || undefined,
    name: brandName,
    logoPath,
    primaryColor: colors.primary,
    secondaryColor: colors.secondary,
    accentColor: colors.accent,
    paleColor: colors.pale,
    footerText,
    userId: session.user.id,
  });
  if (!presetSaved) return { error: "Course branding was saved, but the reusable branding library could not be updated." };

  revalidatePath("/admin/branding");
  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/learn/${courseId}`);
  return { success: `${course.title} branding and library entry saved.` };
}

export async function applyBrandingPreset(input: { courseId: string; presetId: string }): Promise<CourseBrandingFormState> {
  const { session } = await requireAdmin();
  const course = getCourseBySlug(input.courseId);
  if (!course) return { error: "Choose a valid course." };

  const presetResponse = await adminRest(`/rest/v1/branding_presets?id=eq.${encodeURIComponent(input.presetId)}&select=name,logo_path,primary_color,secondary_color,accent_color,pale_color,footer_text&limit=1`);
  if (!presetResponse.ok) return { error: "The selected saved branding could not be found." };
  const preset = (await presetResponse.json()) as Array<{
    name: string; logo_path: string | null; primary_color: string; secondary_color: string;
    accent_color: string; pale_color: string; footer_text: string;
  }>;
  const selected = preset[0];
  if (!selected) return { error: "The selected saved branding could not be found." };

  const response = await adminRest("/rest/v1/course_branding?on_conflict=course_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      course_id: course.slug,
      brand_name: selected.name,
      logo_path: selected.logo_path,
      primary_color: selected.primary_color,
      secondary_color: selected.secondary_color,
      accent_color: selected.accent_color,
      pale_color: selected.pale_color,
      footer_text: selected.footer_text,
      is_active: true,
      updated_by: session.user.id,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) return { error: "Saved branding could not be applied to this course." };

  revalidatePath("/admin/branding");
  revalidatePath(`/courses/${course.slug}`);
  revalidatePath(`/learn/${course.slug}`);
  return { success: `${selected.name} branding applied to ${course.title}.` };
}

export async function restoreApgIBranding(courseId: string): Promise<CourseBrandingFormState> {
  await requireAdmin();
  const course = getCourseBySlug(courseId);
  if (!course) return { error: "Choose a valid course." };

  const response = await adminRest(`/rest/v1/course_branding?course_id=eq.${encodeURIComponent(course.slug)}`, { method: "DELETE" });
  if (!response.ok) return { error: "APGI branding could not be restored." };

  revalidatePath("/admin/branding");
  revalidatePath(`/courses/${course.slug}`);
  revalidatePath(`/learn/${course.slug}`);
  return { success: `APGI branding restored for ${course.title}.` };
}
