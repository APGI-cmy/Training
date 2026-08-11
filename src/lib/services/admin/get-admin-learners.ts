import "server-only";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getCourses } from "@/lib/courses";
import { adminRest } from "@/server/supabase/admin-rest";

const pageSize = 25;

type ProfileRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  preferred_name: string | null;
  created_at: string;
  updated_at: string;
};

type EnrolmentRow = {
  user_id: string;
  course_id: string;
  status: "pending" | "enrolled" | "revoked";
  updated_at: string;
};

export type AdminLearner = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  lastActivityAt: string;
  enrolmentCount: number;
  status: "enrolled" | "pending" | "revoked" | "no_enrolments";
  courseSummary: string;
};

export type AdminLearnerPage = {
  learners: AdminLearner[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  unavailable: boolean;
};

function escapePostgrestFilter(value: string) {
  return value.replace(/[*,()]/g, "").replace(/%/g, "");
}

function toSummary(rows: EnrolmentRow[]): Pick<AdminLearner, "status" | "courseSummary"> {
  if (!rows.length) return { status: "no_enrolments" as const, courseSummary: "No course relationship" };
  const status: AdminLearner["status"] = rows.some((row) => row.status === "enrolled")
    ? "enrolled"
    : rows.some((row) => row.status === "pending")
      ? "pending"
      : "revoked";
  const names = new Map(getCourses().map((course) => [course.id, course.title]));
  const titles = rows.slice(0, 2).map((row) => names.get(row.course_id) ?? row.course_id);
  return {
    status,
    courseSummary: `${titles.join(", ")}${rows.length > 2 ? ` +${rows.length - 2} more` : ""}`
  };
}

export async function getAdminLearners(input: { search?: string; page?: number } = {}): Promise<AdminLearnerPage> {
  await requireAdmin();
  const page = Math.max(1, Number.isFinite(input.page) ? Math.floor(input.page ?? 1) : 1);
  const search = escapePostgrestFilter(input.search?.trim() ?? "");
  const offset = (page - 1) * pageSize;
  const range = `${offset}-${offset + pageSize - 1}`;
  const searchFilter = search
    ? `&or=(email.ilike.*${encodeURIComponent(search)}*,full_name.ilike.*${encodeURIComponent(search)}*,preferred_name.ilike.*${encodeURIComponent(search)}*)`
    : "";

  try {
    const profileResponse = await adminRest(
      `/rest/v1/profiles?select=user_id,email,full_name,preferred_name,created_at,updated_at&order=created_at.desc${searchFilter}`,
      { headers: { Range: range, Prefer: "count=exact" } }
    );
    if (!profileResponse.ok) throw new Error("ADMIN_LEARNER_DIRECTORY_UNAVAILABLE");
    const profiles = (await profileResponse.json()) as ProfileRow[];
    const contentRange = profileResponse.headers.get("content-range");
    const total = Number(contentRange?.split("/")[1] ?? profiles.length) || 0;
    const ids = profiles.map((profile) => profile.user_id);
    const enrolmentsByUser = new Map<string, EnrolmentRow[]>();

    if (ids.length) {
      const enrolmentResponse = await adminRest(
        `/rest/v1/course_enrolments?select=user_id,course_id,status,updated_at&user_id=in.(${ids.join(",")})`
      );
      if (!enrolmentResponse.ok) throw new Error("ADMIN_LEARNER_ENROLMENTS_UNAVAILABLE");
      for (const enrolment of (await enrolmentResponse.json()) as EnrolmentRow[]) {
        enrolmentsByUser.set(enrolment.user_id, [...(enrolmentsByUser.get(enrolment.user_id) ?? []), enrolment]);
      }
    }

    return {
      learners: profiles.map((profile) => {
        const enrolments = enrolmentsByUser.get(profile.user_id) ?? [];
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
      }),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      unavailable: false
    };
  } catch {
    return { learners: [], page, pageSize, total: 0, totalPages: 1, unavailable: true };
  }
}
