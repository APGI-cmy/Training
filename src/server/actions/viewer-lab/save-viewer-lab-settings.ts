"use server";

import { revalidatePath } from "next/cache";
import { getCourseBySlug } from "@/lib/courses";
import { SCANNEX_COURSE_ID } from "@/lib/services/viewer-lab/viewer-lab-settings";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminRest } from "@/server/supabase/admin-rest";

export type ViewerLabSettingsFormState = { error?: string; success?: string };

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function integerValue(formData: FormData, key: string, multiplier = 1) {
  return Math.round(Number(textValue(formData, key)) * multiplier);
}

function optionalIsoDate(formData: FormData, key: string) {
  const value = textValue(formData, key);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export async function saveViewerLabSettings(
  _previous: ViewerLabSettingsFormState,
  formData: FormData
): Promise<ViewerLabSettingsFormState> {
  const { session } = await requireAdmin();
  const courseId = textValue(formData, "course_id");
  if (courseId !== SCANNEX_COURSE_ID) return { error: "Viewer controls are available only for the Scannex course." };

  const course = getCourseBySlug(courseId);
  if (!course) return { error: "The Scannex course could not be found." };
  const validUnitSlugs = new Set(course.units.map((unit) => unit.slug));
  const enabledUnitSlugs = formData.getAll("enabled_unit_slugs").map(String).filter((slug) => validUnitSlugs.has(slug));
  if (!enabledUnitSlugs.length) return { error: "Select at least one learning unit that requires the Viewer." };

  const accessOpensAt = optionalIsoDate(formData, "access_opens_at");
  const accessClosesAt = optionalIsoDate(formData, "access_closes_at");
  if (accessOpensAt === undefined || accessClosesAt === undefined) return { error: "Enter valid Viewer opening and closing dates." };
  if (accessOpensAt && accessClosesAt && new Date(accessClosesAt) <= new Date(accessOpensAt)) {
    return { error: "The Viewer closing date must be after the opening date." };
  }

  const estimatedCostPerLearnerCents = integerValue(formData, "estimated_cost_per_learner", 100);
  const additionalSessionCostCents = integerValue(formData, "additional_session_cost", 100);
  const toleranceBps = integerValue(formData, "tolerance_percent", 100);
  const minimumReadyCapacity = integerValue(formData, "minimum_ready_capacity");
  const maximumCapacity = integerValue(formData, "maximum_capacity");
  const expectedConcurrencyBps = integerValue(formData, "expected_concurrency_percent", 100);
  const capacityBuffer = integerValue(formData, "capacity_buffer");
  const warmupMinutes = integerValue(formData, "warmup_minutes");

  if (!Number.isInteger(estimatedCostPerLearnerCents) || estimatedCostPerLearnerCents < 0 || estimatedCostPerLearnerCents > 100000) return { error: "Enter a valid estimated Viewer cost per learner." };
  if (!Number.isInteger(additionalSessionCostCents) || additionalSessionCostCents < 0 || additionalSessionCostCents > 100000) return { error: "Enter a valid additional session cost." };
  if (!Number.isInteger(toleranceBps) || toleranceBps < 0 || toleranceBps > 10000) return { error: "Enter a tolerance from 0% to 100%." };
  if (!Number.isInteger(minimumReadyCapacity) || minimumReadyCapacity < 0 || minimumReadyCapacity > 1000) return { error: "Enter a valid minimum ready capacity." };
  if (!Number.isInteger(maximumCapacity) || maximumCapacity < 1 || maximumCapacity > 1000 || maximumCapacity < minimumReadyCapacity) return { error: "Maximum capacity must be at least the minimum ready capacity." };
  if (!Number.isInteger(expectedConcurrencyBps) || expectedConcurrencyBps < 100 || expectedConcurrencyBps > 10000) return { error: "Expected concurrent use must be from 1% to 100%." };
  if (!Number.isInteger(capacityBuffer) || capacityBuffer < 0 || capacityBuffer > 100) return { error: "Enter a capacity buffer from 0 to 100." };
  if (!Number.isInteger(warmupMinutes) || warmupMinutes < 5 || warmupMinutes > 60) return { error: "Warm-up time must be from 5 to 60 minutes." };

  const response = await adminRest("/rest/v1/course_viewer_lab_settings?on_conflict=course_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      course_id: courseId,
      enabled: formData.get("enabled") === "on",
      enabled_unit_slugs: enabledUnitSlugs,
      access_opens_at: accessOpensAt,
      access_closes_at: accessClosesAt,
      estimated_cost_per_learner_cents: estimatedCostPerLearnerCents,
      additional_session_cost_cents: additionalSessionCostCents,
      tolerance_bps: toleranceBps,
      minimum_ready_capacity: minimumReadyCapacity,
      maximum_capacity: maximumCapacity,
      expected_concurrency_bps: expectedConcurrencyBps,
      capacity_buffer: capacityBuffer,
      warmup_minutes: warmupMinutes,
      updated_by: session.user.id,
      updated_at: new Date().toISOString()
    })
  });
  if (!response.ok) return { error: "Viewer settings could not be saved. Confirm that the Viewer capacity database migration is live." };

  revalidatePath(`/admin/courses/${courseId}/viewer-lab`);
  revalidatePath(`/admin/courses/${courseId}/preview`);
  revalidatePath("/catalogue");
  for (const unitSlug of course.units.map((unit) => unit.slug)) revalidatePath(`/learn/${courseId}/units/${unitSlug}`);
  return { success: "Scannex Viewer settings saved." };
}
