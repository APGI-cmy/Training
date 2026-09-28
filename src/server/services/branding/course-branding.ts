import { BrandingPreset, CourseBranding } from "@/lib/branding";
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

type BrandingPresetRow = Omit<BrandingRow, "course_id" | "is_active"> & { id: string; name: string };

function logoUrl(logoPath: string | null) {
  return logoPath ? getSupabaseRestUrl(`/storage/v1/object/public/alp-branding-assets/${logoPath}`) : null;
}

function toCourseBranding(row: BrandingRow): CourseBranding {
  return {
    courseId: row.course_id,
    brandName: row.brand_name,
    logoUrl: logoUrl(row.logo_path),
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    accentColor: row.accent_color,
    paleColor: row.pale_color,
    footerText: row.footer_text,
    isActive: row.is_active,
  };
}

function toBrandingPreset(row: BrandingPresetRow): BrandingPreset {
  return {
    id: row.id,
    brandName: row.name,
    logoUrl: logoUrl(row.logo_path),
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    accentColor: row.accent_color,
    paleColor: row.pale_color,
    footerText: row.footer_text,
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

export async function getBrandingPresets(): Promise<BrandingPreset[]> {
  try {
    const response = await adminRest("/rest/v1/branding_presets?select=id,name,logo_path,primary_color,secondary_color,accent_color,pale_color,footer_text&order=name.asc");
    if (!response.ok) return [];
    return ((await response.json()) as BrandingPresetRow[]).map(toBrandingPreset);
  } catch {
    return [];
  }
}
