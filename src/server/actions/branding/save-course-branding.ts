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

  revalidatePath("/admin/branding");
  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/learn/${courseId}`);
  return { success: `${course.title} branding saved.` };
}
