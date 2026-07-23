"use server";

import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminRest } from "@/server/supabase/admin-rest";

export async function changeEnrolmentStatus(input: {
  userId: string;
  courseId: string;
  nextStatus: "enrolled" | "revoked";
  reason: string;
}) {
  const { session } = await requireAdmin();
  const actorId = session.user.id;
  const reason = input.reason.trim();

  if (!reason) return { ok: false, error: "ENROLMENT_REASON_REQUIRED" };

  const currentResponse = await adminRest(
    `/rest/v1/course_enrolments?select=status&user_id=eq.${input.userId}&course_id=eq.${input.courseId}&limit=1`
  );
  const currentRows = currentResponse.ok ? ((await currentResponse.json()) as Array<{ status?: string }>) : [];
  const previousStatus = currentRows[0]?.status ?? "pending";
  const nextStatus = input.nextStatus;
  const now = new Date().toISOString();
  const reinstated = previousStatus === "revoked" && nextStatus === "enrolled";

  const updateResponse = await adminRest(
    `/rest/v1/course_enrolments?user_id=eq.${input.userId}&course_id=eq.${input.courseId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: nextStatus,
        access_granted_at: nextStatus === "enrolled" ? now : null,
        access_revoked_at: nextStatus === "revoked" ? now : null,
        metadata: { actorId, reason, previousStatus, nextStatus, reinstated }
      })
    }
  );

  if (!updateResponse.ok) return { ok: false, error: "ENROLMENT_UPDATE_FAILED" };

  await adminRest("/rest/v1/course_enrolment_events", {
    method: "POST",
    body: JSON.stringify({
      event_key: `admin:${randomUUID()}`,
      user_id: input.userId,
      course_id: input.courseId,
      event_type: nextStatus === "revoked" ? "enrolment_revoked" : "enrolment_granted",
      previous_status: previousStatus,
      next_status: nextStatus,
      metadata: { actorId, reason, reinstated: reinstated ? "reinstated" : false }
    })
  });

  return { ok: true, actorId, reason, previousStatus, nextStatus, reinstated };
}
