import { CourseBranding } from "@/lib/branding";
import { getSupabaseRestUrl } from "@/server/auth/session";
import { adminRest } from "@/server/supabase/admin-rest";

type BrandingRow = {
  course_id: string;
  brand_name: string;
  logo_path: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  pale_color: string;
  footer_text: string;
  is_active: boolean;
};

function toCourseBranding(row: BrandingRow): CourseBranding {
  const logoUrl = row.logo_path
    ? getSupabaseRestUrl(`/storage/v1/object/public/alp-branding-assets/${row.logo_path}`)
    : null;

  return {
    courseId: row.course_id,
    brandName: row.brand_name,
    logoUrl,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    accentColor: row.accent_color,
    paleColor: row.pale_color,
    footerText: row.footer_text,
    isActive: row.is_active,
  };
}

export async function getCourseBranding(courseId: string): Promise<CourseBranding | null> {
  try {
    const response = await adminRest(
      `/rest/v1/course_branding?course_id=eq.${encodeURIComponent(courseId)}&select=course_id,brand_name,logo_path,primary_color,secondary_color,accent_color,pale_color,footer_text,is_active&limit=1`,
    );
    if (!response.ok) return null;
    const rows = (await response.json()) as BrandingRow[];
    const row = rows[0];
    return row?.is_active ? toCourseBranding(row) : null;
  } catch {
    return null;
  }
}

export async function getCourseBrandingForAdmin(courseId: string): Promise<CourseBranding | null> {
  try {
    const response = await adminRest(
      `/rest/v1/course_branding?course_id=eq.${encodeURIComponent(courseId)}&select=course_id,brand_name,logo_path,primary_color,secondary_color,accent_color,pale_color,footer_text,is_active&limit=1`,
    );
    if (!response.ok) return null;
    const rows = (await response.json()) as BrandingRow[];
    return rows[0] ? toCourseBranding(rows[0]) : null;
  } catch {
    return null;
  }
}
