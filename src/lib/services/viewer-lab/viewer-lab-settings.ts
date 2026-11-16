import "server-only";
import { adminRest } from "@/server/supabase/admin-rest";
import {
  defaultViewerLabSettings,
  recommendedViewerCapacity,
  SCANNEX_COURSE_ID,
  viewerCostAllowanceCents,
  type ViewerLabSettings
} from "@/lib/services/viewer-lab/viewer-lab-policy";

export {
  defaultViewerLabSettings,
  evaluateViewerLabAvailability,
  recommendedViewerCapacity,
  SCANNEX_COURSE_ID,
  viewerCostAllowanceCents
} from "@/lib/services/viewer-lab/viewer-lab-policy";
export type { ViewerLabAvailability, ViewerLabSettings } from "@/lib/services/viewer-lab/viewer-lab-policy";

type SettingsRow = {
  course_id: string;
  enabled: boolean;
  enabled_unit_slugs: string[];
  access_opens_at: string | null;
  access_closes_at: string | null;
  estimated_cost_per_learner_cents: number;
  additional_session_cost_cents: number;
  tolerance_bps: number;
  minimum_ready_capacity: number;
  maximum_capacity: number;
  expected_concurrency_bps: number;
  capacity_buffer: number;
  warmup_minutes: number;
};

function fromRow(row: SettingsRow): ViewerLabSettings {
  return {
    courseId: row.course_id,
    enabled: row.enabled,
    enabledUnitSlugs: row.enabled_unit_slugs,
    accessOpensAt: row.access_opens_at,
    accessClosesAt: row.access_closes_at,
    estimatedCostPerLearnerCents: row.estimated_cost_per_learner_cents,
    additionalSessionCostCents: row.additional_session_cost_cents,
    toleranceBps: row.tolerance_bps,
    minimumReadyCapacity: row.minimum_ready_capacity,
    maximumCapacity: row.maximum_capacity,
    expectedConcurrencyBps: row.expected_concurrency_bps,
    capacityBuffer: row.capacity_buffer,
    warmupMinutes: row.warmup_minutes
  };
}

export async function getViewerLabSettings(): Promise<ViewerLabSettings> {
  try {
    const response = await adminRest(
      "/rest/v1/course_viewer_lab_settings?select=course_id,enabled,enabled_unit_slugs,access_opens_at,access_closes_at,estimated_cost_per_learner_cents,additional_session_cost_cents,tolerance_bps,minimum_ready_capacity,maximum_capacity,expected_concurrency_bps,capacity_buffer,warmup_minutes&course_id=eq.scannex-training-programme&limit=1"
    );
    if (!response.ok) return defaultViewerLabSettings;
    const rows = (await response.json()) as SettingsRow[];
    return rows[0] ? fromRow(rows[0]) : defaultViewerLabSettings;
  } catch {
    return defaultViewerLabSettings;
  }
}

export type ViewerLabCostSummary = {
  activeEnrolments: number;
  launchCount: number;
  uniqueLearners: number;
  trackedCostCents: number;
  budgetCents: number;
  remainingCents: number;
  overTolerance: boolean;
  recommendedCapacity: number;
};

export async function getViewerLabCostSummary(settings: ViewerLabSettings): Promise<ViewerLabCostSummary> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  try {
    const [enrolmentsResponse, sessionsResponse] = await Promise.all([
      adminRest("/rest/v1/course_enrolments?select=user_id&course_id=eq.scannex-training-programme&status=eq.enrolled"),
      adminRest(`/rest/v1/viewer_lab_sessions?select=user_id,estimated_cost_cents&course_id=eq.scannex-training-programme&status=eq.launched&started_at=gte.${encodeURIComponent(monthStart.toISOString())}`)
    ]);
    const enrolments = enrolmentsResponse.ok ? (await enrolmentsResponse.json()) as Array<{ user_id: string }> : [];
    const sessions = sessionsResponse.ok ? (await sessionsResponse.json()) as Array<{ user_id: string; estimated_cost_cents: number }> : [];
    const trackedCostCents = sessions.reduce((total, session) => total + session.estimated_cost_cents, 0);
    const budgetCents = enrolments.length * viewerCostAllowanceCents(settings);
    return {
      activeEnrolments: enrolments.length,
      launchCount: sessions.length,
      uniqueLearners: new Set(sessions.map((session) => session.user_id)).size,
      trackedCostCents,
      budgetCents,
      remainingCents: budgetCents - trackedCostCents,
      overTolerance: trackedCostCents > budgetCents,
      recommendedCapacity: recommendedViewerCapacity(settings, enrolments.length)
    };
  } catch {
    return {
      activeEnrolments: 0,
      launchCount: 0,
      uniqueLearners: 0,
      trackedCostCents: 0,
      budgetCents: 0,
      remainingCents: 0,
      overTolerance: false,
      recommendedCapacity: settings.minimumReadyCapacity
    };
  }
}

export async function recordViewerLabLaunch({
  userId,
  unitSlug,
  settings,
  launchExpiresAt
}: {
  userId: string;
  unitSlug: string;
  settings: ViewerLabSettings;
  launchExpiresAt: Date;
}) {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const existingResponse = await adminRest(
    `/rest/v1/viewer_lab_sessions?select=id&user_id=eq.${encodeURIComponent(userId)}&course_id=eq.scannex-training-programme&status=eq.launched&started_at=gte.${encodeURIComponent(monthStart.toISOString())}&limit=1`
  );
  const existing = existingResponse.ok ? (await existingResponse.json()) as Array<{ id: string }> : [];
  const estimatedCostCents = existing.length
    ? settings.additionalSessionCostCents
    : settings.estimatedCostPerLearnerCents;
  const response = await adminRest("/rest/v1/viewer_lab_sessions", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: userId,
      course_id: SCANNEX_COURSE_ID,
      unit_slug: unitSlug,
      status: "launched",
      estimated_cost_cents: estimatedCostCents,
      metadata: { launch_expires_at: launchExpiresAt.toISOString() }
    })
  });
  if (!response.ok) throw new Error("VIEWER_LAB_SESSION_NOT_RECORDED");
}
