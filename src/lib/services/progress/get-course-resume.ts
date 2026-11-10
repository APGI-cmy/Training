import { getSupabaseRestUrl } from "@/server/auth/session";
import { getCourseBySlug } from "@/lib/courses";

export type CourseResume = {
  href: string;
  title: string;
  savedAt: string;
  units: Record<string, number | null>;
};

export function courseResumeFromRows(courseSlug: string, rows: unknown): CourseResume | null {
  const course = getCourseBySlug(courseSlug);
  if (!course || !Array.isArray(rows)) return null;
  const saved = rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const unit = course.units.find((item) => item.id === row.unit_id && item.scormPath);
    return unit && typeof row.updated_at === "string" && Number.isFinite(Date.parse(row.updated_at)) && (row.suspend_data || row.location)
      ? [{ unit, savedAt: row.updated_at as string, progress: typeof row.progress_measure === "number" && Number.isFinite(row.progress_measure) ? Math.round(Math.max(0, Math.min(1, row.progress_measure)) * 100) : null }]
      : [];
  }).sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
  if (!saved.length) return null;
  return {
    href: `/learn/${course.slug}/units/${saved[0].unit.slug}/scorm`,
    title: `LU ${saved[0].unit.order}: ${saved[0].unit.title}`,
    savedAt: saved[0].savedAt,
    units: Object.fromEntries(saved.map((item) => [item.unit.id, item.progress]))
  };
}

export async function getCourseResume(accessToken: string, userId: string, courseSlug: string): Promise<CourseResume | null> {
  const course = getCourseBySlug(courseSlug);
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!course || !apiKey) return null;
  const url = getSupabaseRestUrl(`/rest/v1/scorm_attempts?select=unit_id,updated_at,progress_measure,location,suspend_data&user_id=eq.${encodeURIComponent(userId)}&course_id=eq.${encodeURIComponent(course.id)}&order=updated_at.desc`);
  if (!url) return null;
  try {
    const response = await fetch(url, { headers: { apikey: apiKey, authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    return response.ok ? courseResumeFromRows(courseSlug, await response.json()) : null;
  } catch { return null; }
}
