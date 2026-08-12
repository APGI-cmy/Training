import "server-only";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getCourses } from "@/lib/courses";
import { adminRest } from "@/server/supabase/admin-rest";

const pageSize = 25;

type ProfileRow = { user_id: string; email: string | null; full_name: string | null; preferred_name: string | null; created_at: string; updated_at: string };
type EnrolmentRow = { user_id: string; course_id: string; status: "pending" | "enrolled" | "revoked"; updated_at: string };

export type AdminLearner = { id: string; name: string; email: string; createdAt: string; lastActivityAt: string; enrolmentCount: number; status: "enrolled" | "pending" | "revoked" | "no_enrolments"; courseSummary: string };
export type AdminLearnerPage = { learners: AdminLearner[]; page: number; pageSize: number; total: number; totalPages: number; unavailable: boolean };

function escapePostgrestFilter(value: string) {
  // PostgREST ILIKE uses %, _ and \\ as pattern syntax. Keep free-text searches literal.
  return value.replace(/[\\%_]/g, "\\\\$&").replace(/[*,()]/g, "");
}

function toSummary(rows: EnrolmentRow[]): Pick<AdminLearner, "status" | "courseSummary"> {
  if (!rows.length) return { status: "no_enrolments", courseSummary: "No course relationship" };
  const status: AdminLearner["status"] = rows.some((row) => row.status === "enrolled") ? "enrolled" : rows.some((row) => row.status === "pending") ? "pending" : "revoked";
  const names = new Map(getCourses().map((course) => [course.id, course.title]));
  const titles = rows.slice(0, 2).map((row) => names.get(row.course_id) ?? row.course_id);
  return { status, courseSummary: `${titles.join(", ")}${rows.length > 2 ? ` +${rows.length - 2} more` : ""}` };
}

function toLearner(profile: ProfileRow, enrolments: EnrolmentRow[]): AdminLearner {
  const summary = toSummary(enrolments);
  return {
    id: profile.user_id,
    name: profile.preferred_name || profile.full_name || "Learner profile incomplete",
    email: profile.email || "Email unavailable",
    createdAt: profile.created_at,
    lastActivityAt: [profile.updated_at, ...enrolments.map((row) => row.updated_at)].sort().at(-1) ?? profile.created_at,
    enrolmentCount: enrolments.length,
    ...summary
  };
}

async function getEnrolments(userIds: string[]) {
  if (!userIds.length) return new Map<string, EnrolmentRow[]>();
  const response = await adminRest(`/rest/v1/course_enrolments?select=user_id,course_id,status,updated_at&user_id=in.(${userIds.join(",")})`);
  if (!response.ok) throw new Error("ADMIN_LEARNER_ENROLMENTS_UNAVAILABLE");
  const byUser = new Map<string, EnrolmentRow[]>();
  for (const enrolment of (await response.json()) as EnrolmentRow[]) {
    byUser.set(enrolment.user_id, [...(byUser.get(enrolment.user_id) ?? []), enrolment]);
  }
  return byUser;
}

export async function getAdminLearner(learnerId?: string): Promise<AdminLearner | null> {
  await requireAdmin();
  if (!learnerId) return null;
  const response = await adminRest(`/rest/v1/profiles?select=user_id,email,full_name,preferred_name,created_at,updated_at&user_id=eq.${encodeURIComponent(learnerId)}`);
  if (!response.ok) return null;
  const profile = ((await response.json()) as ProfileRow[])[0];
  if (!profile) return null;
  const enrolments = await getEnrolments([profile.user_id]);
  return toLearner(profile, enrolments.get(profile.user_id) ?? []);
}

export async function getAdminLearners(input: { search?: string; page?: number } = {}): Promise<AdminLearnerPage> {
  await requireAdmin();
  const page = Math.max(1, Number.isFinite(input.page) ? Math.floor(input.page ?? 1) : 1);
  const search = escapePostgrestFilter(input.search?.trim() ?? "");
  const offset = (page - 1) * pageSize;
  const range = `${offset}-${offset + pageSize - 1}`;
  const searchFilter = search ? `&or=(email.ilike.*${encodeURIComponent(search)}*,full_name.ilike.*${encodeURIComponent(search)}*,preferred_name.ilike.*${encodeURIComponent(search)}*)` : "";

  try {
    const profileResponse = await adminRest(`/rest/v1/profiles?select=user_id,email,full_name,preferred_name,created_at,updated_at&order=created_at.desc${searchFilter}`, { headers: { Range: range, Prefer: "count=exact" } });
    if (!profileResponse.ok) throw new Error("ADMIN_LEARNER_DIRECTORY_UNAVAILABLE");
    const profiles = (await profileResponse.json()) as ProfileRow[];
    const total = Number(profileResponse.headers.get("content-range")?.split("/")[1] ?? profiles.length) || 0;
    const enrolments = await getEnrolments(profiles.map((profile) => profile.user_id));
    return { learners: profiles.map((profile) => toLearner(profile, enrolments.get(profile.user_id) ?? [])), page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)), unavailable: false };
  } catch {
    return { learners: [], page, pageSize, total: 0, totalPages: 1, unavailable: true };
  }
}
