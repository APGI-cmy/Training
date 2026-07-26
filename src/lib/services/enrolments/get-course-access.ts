import { getSupabaseRestUrl } from "@/server/auth/session";

export type CourseEnrolmentStatus = "not_enrolled" | "pending" | "enrolled" | "revoked" | "unknown";

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
    reason: "No active enrolment or pending invitation was found for this course."
  };
}

export function unknownAccessDecision(userId: string, courseId: string): CourseAccessDecision {
  return {
    courseId,
    userId,
    status: "unknown",
    canAccess: false,
    reason: "Course access could not be verified. Please try again or contact support."
  };
}

async function hasPendingInvitation({
  accessToken,
  courseId
}: {
  accessToken: string;
  courseId: string;
}) {
  const headers = enrolmentHeaders(accessToken);
  const url = getSupabaseRestUrl("/rest/v1/rpc/alp_has_pending_invitation");

  if (!headers || !url) return false;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ p_course_id: courseId }),
    cache: "no-store"
  });
  if (!response.ok) return false;
  return (await response.json().catch(() => false)) === true;
}

export async function getCourseAccess({
  accessToken,
  userId,
  userEmail: _userEmail,
  courseId
}: {
  accessToken: string;
  userId: string;
  userEmail?: string;
  courseId: string;
}): Promise<CourseAccessDecision> {
  const headers = enrolmentHeaders(accessToken);
  const url = getSupabaseRestUrl(
    `/rest/v1/course_enrolments?select=status,access_granted_at,access_revoked_at&user_id=eq.${encodeURIComponent(userId)}&course_id=eq.${encodeURIComponent(courseId)}&limit=1`
  );

  if (!headers || !url) {
    return unknownAccessDecision(userId, courseId);
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    return unknownAccessDecision(userId, courseId);
  }

  let rows: CourseEnrolmentRow[];

  try {
    rows = (await response.json()) as CourseEnrolmentRow[];
  } catch {
    return unknownAccessDecision(userId, courseId);
  }

  const enrolment = rows[0];

  if (!enrolment?.status) {
    if (await hasPendingInvitation({ accessToken, courseId })) {
      return {
        courseId,
        userId,
        status: "pending",
        canAccess: false,
        reason: "A course invitation is pending acceptance and does not grant access yet."
      };
    }
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
