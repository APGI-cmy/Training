import { getSupabaseRestUrl } from "@/server/auth/session";

export type CourseEnrolmentStatus = "not_enrolled" | "pending" | "enrolled" | "revoked";

export interface CourseAccessDecision {
  courseId: string;
  userId: string;
  status: CourseEnrolmentStatus;
  canAccess: boolean;
  reason: string;
  accessGrantedAt?: string | null;
  accessRevokedAt?: string | null;
}

interface CourseEnrolmentRow {
  status?: "pending" | "enrolled" | "revoked";
  access_granted_at?: string | null;
  access_revoked_at?: string | null;
}

function enrolmentHeaders(accessToken: string) {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!anonKey) {
    return null;
  }

  return {
    apikey: anonKey,
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json"
  };
}

export function notEnrolledDecision(userId: string, courseId: string): CourseAccessDecision {
  return {
    courseId,
    userId,
    status: "not_enrolled",
    canAccess: false,
    reason: "No enrolment record exists for this learner and course."
  };
}

export async function getCourseAccess({
  accessToken,
  userId,
  courseId
}: {
  accessToken: string;
  userId: string;
  courseId: string;
}): Promise<CourseAccessDecision> {
  const headers = enrolmentHeaders(accessToken);
  const url = getSupabaseRestUrl(
    `/rest/v1/course_enrolments?select=status,access_granted_at,access_revoked_at&user_id=eq.${userId}&course_id=eq.${courseId}&limit=1`
  );

  if (!headers || !url) {
    return notEnrolledDecision(userId, courseId);
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    return notEnrolledDecision(userId, courseId);
  }

  const rows = (await response.json().catch(() => [])) as CourseEnrolmentRow[];
  const enrolment = rows[0];

  if (!enrolment?.status) {
    return notEnrolledDecision(userId, courseId);
  }

  if (enrolment.status === "enrolled") {
    return {
      courseId,
      userId,
      status: "enrolled",
      canAccess: true,
      reason: "Learner has an active course enrolment.",
      accessGrantedAt: enrolment.access_granted_at ?? null,
      accessRevokedAt: enrolment.access_revoked_at ?? null
    };
  }

  if (enrolment.status === "revoked") {
    return {
      courseId,
      userId,
      status: "revoked",
      canAccess: false,
      reason: "Learner course access has been revoked.",
      accessGrantedAt: enrolment.access_granted_at ?? null,
      accessRevokedAt: enrolment.access_revoked_at ?? null
    };
  }

  return {
    courseId,
    userId,
    status: "pending",
    canAccess: false,
    reason: "Learner enrolment is pending and does not grant course access yet.",
    accessGrantedAt: enrolment.access_granted_at ?? null,
    accessRevokedAt: enrolment.access_revoked_at ?? null
  };
}
