import { getCourseBySlug } from "@/lib/courses";
import { evaluateCompletionRule } from "@/lib/services/completion/evaluate-completion-rule";
import { getLearnerProgress } from "@/lib/services/progress/get-learner-progress";
import { getSupabaseRestUrl, type AlpSession } from "@/server/auth/session";

export type ProgressEventType = "unit_opened" | "unit_completed";

function progressHeaders(accessToken: string, prefer?: string) {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!anonKey) {
    return null;
  }

  return {
    apikey: anonKey,
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
    ...(prefer ? { Prefer: prefer } : {})
  };
}

async function postJson({
  accessToken,
  path,
  body,
  prefer
}: {
  accessToken: string;
  path: string;
  body: unknown;
  prefer?: string;
}) {
  const url = getSupabaseRestUrl(path);
  const headers = progressHeaders(accessToken, prefer);

  if (!url || !headers) {
    return false;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store"
  });

  return response.ok;
}

export async function recordProgressForSession({
  session,
  courseSlug,
  unitSlug,
  eventType
}: {
  session: AlpSession;
  courseSlug: string;
  unitSlug: string;
  eventType: ProgressEventType;
}) {
  const course = getCourseBySlug(courseSlug);

  if (!course) {
    return;
  }

  const unit = course.units.find(
    (candidate) => candidate.slug === unitSlug || candidate.legacySlug === unitSlug
  );

  if (!unit) {
    return;
  }

  const occurredAt = new Date().toISOString();
  const eventKey = `${session.user.id}:${course.id}:${unit.id}:${eventType}`;

  await postJson({
    accessToken: session.accessToken,
    path: "/rest/v1/progress_events?on_conflict=event_key",
    prefer: "resolution=ignore-duplicates",
    body: {
      event_key: eventKey,
      user_id: session.user.id,
      course_id: course.id,
      unit_id: unit.id,
      event_type: eventType,
      occurred_at: occurredAt,
      metadata: {
        course_slug: course.slug,
        unit_slug: unit.slug
      }
    }
  });

  const progressBeforeWrite = await getLearnerProgress({
    accessToken: session.accessToken,
    userId: session.user.id,
    courseId: course.id
  });
  const wasAlreadyCompleted = progressBeforeWrite.completedUnitIds.has(unit.id);
  const nextStatus = eventType === "unit_completed" || wasAlreadyCompleted ? "completed" : "opened";

  await postJson({
    accessToken: session.accessToken,
    path: "/rest/v1/learner_progress?on_conflict=user_id,course_id,unit_id",
    prefer: "resolution=merge-duplicates",
    body: {
      user_id: session.user.id,
      course_id: course.id,
      unit_id: unit.id,
      status: nextStatus,
      first_opened_at: progressBeforeWrite.openedUnitIds.has(unit.id) ? undefined : occurredAt,
      completed_at: nextStatus === "completed" ? occurredAt : null,
      updated_at: occurredAt
    }
  });

  const completedUnitIds = new Set(progressBeforeWrite.completedUnitIds);

  if (nextStatus === "completed") {
    completedUnitIds.add(unit.id);
  }

  const evaluation = evaluateCompletionRule({
    totalUnits: course.units.length,
    completedUnits: completedUnitIds.size
  });

  await postJson({
    accessToken: session.accessToken,
    path: "/rest/v1/completion_states?on_conflict=user_id,course_id",
    prefer: "resolution=merge-duplicates",
    body: {
      user_id: session.user.id,
      course_id: course.id,
      status: evaluation.status,
      completed_units: evaluation.completedUnits,
      total_units: evaluation.totalUnits,
      progress_percent: evaluation.progressPercent,
      certificate_eligible: evaluation.certificateEligible,
      completed_at: evaluation.status === "completed" ? occurredAt : null,
      updated_at: occurredAt
    }
  });
}
