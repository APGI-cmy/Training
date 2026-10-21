"use client";

import { useActionState } from "react";
import { formatCoursePrice } from "@/lib/commerce";
import type { LearningUnit } from "@/types/course";
import type { ViewerLabCostSummary, ViewerLabSettings } from "@/lib/services/viewer-lab/viewer-lab-settings";
import { saveViewerLabSettings, type ViewerLabSettingsFormState } from "@/server/actions/viewer-lab/save-viewer-lab-settings";

const initialState: ViewerLabSettingsFormState = {};

function localDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function ScannexViewerLabWorkspace({
  settings,
  summary,
  units,
  baseCoursePriceCents,
  currency
}: {
  settings: ViewerLabSettings;
  summary: ViewerLabCostSummary;
  units: LearningUnit[];
  baseCoursePriceCents: number;
  currency: string;
}) {
  const [state, action, pending] = useActionState(saveViewerLabSettings, initialState);
  const toleranceCents = Math.round(settings.estimatedCostPerLearnerCents * settings.toleranceBps / 10_000);
  const allowanceCents = settings.estimatedCostPerLearnerCents + toleranceCents;
  const payablePriceCents = baseCoursePriceCents + allowanceCents;

  return (
    <>
      {summary.overTolerance ? (
        <div className="admin-alert admin-alert--danger" role="alert">
          <strong>Viewer cost tolerance exceeded</strong>
          <span>The tracked monthly estimate is {formatCoursePrice(summary.trackedCostCents, currency)}, which is above the {formatCoursePrice(summary.budgetCents, currency)} allowance for current enrolments.</span>
        </div>
      ) : (
        <div className="admin-alert" role="status">
          <strong>Viewer costs are within tolerance</strong>
          <span>{formatCoursePrice(Math.max(0, summary.remainingCents), currency)} remains in this month&apos;s enrolled-learner allowance.</span>
        </div>
      )}

      <section className="admin-metrics" aria-label="Scannex Viewer cost and capacity summary">
        <article><strong>{summary.activeEnrolments}</strong><span>active Scannex enrolments</span></article>
        <article><strong>{summary.recommendedCapacity}</strong><span>recommended simultaneous places</span></article>
        <article><strong>{formatCoursePrice(summary.trackedCostCents, currency)}</strong><span>tracked Viewer estimate this month</span></article>
        <article><strong>{formatCoursePrice(summary.budgetCents, currency)}</strong><span>cost allowance with tolerance</span></article>
      </section>

      <section className="admin-workspace-grid">
        <form action={action} className="admin-form-card">
          <input type="hidden" name="course_id" value={settings.courseId} />
          <div className="admin-card-heading"><div><p className="eyebrow">Scannex only</p><h2>Viewer availability and capacity</h2></div></div>
          <label className="checkbox-label"><input name="enabled" type="checkbox" defaultChecked={settings.enabled} /> Enable hosted Viewer access for selected Scannex units</label>
          <fieldset className="viewer-unit-fieldset">
            <legend>Learning units that require the Viewer</legend>
            {units.filter((unit) => !unit.practicalAssessment).map((unit) => (
              <label className="checkbox-label" key={unit.slug}>
                <input name="enabled_unit_slugs" type="checkbox" value={unit.slug} defaultChecked={settings.enabledUnitSlugs.includes(unit.slug)} />
                LU {unit.order}: {unit.title}
              </label>
            ))}
          </fieldset>
          <div className="admin-form-grid">
            <label>Viewer access opens<input name="access_opens_at" type="datetime-local" defaultValue={localDateTime(settings.accessOpensAt)} /></label>
            <label>Viewer access closes<input name="access_closes_at" type="datetime-local" defaultValue={localDateTime(settings.accessClosesAt)} /></label>
            <label>Minimum ready places<input name="minimum_ready_capacity" type="number" min="0" max="1000" defaultValue={settings.minimumReadyCapacity} required /></label>
            <label>Maximum simultaneous places<input name="maximum_capacity" type="number" min="1" max="1000" defaultValue={settings.maximumCapacity} required /></label>
            <label>Expected simultaneous use (%)<input name="expected_concurrency_percent" type="number" min="1" max="100" step="0.01" defaultValue={(settings.expectedConcurrencyBps / 100).toFixed(2)} required /></label>
            <label>Safety buffer (places)<input name="capacity_buffer" type="number" min="0" max="100" defaultValue={settings.capacityBuffer} required /></label>
            <label>Warm-up notice (minutes)<input name="warmup_minutes" type="number" min="5" max="60" defaultValue={settings.warmupMinutes} required /></label>
          </div>

          <div className="admin-card-heading"><div><p className="eyebrow">Cost allowance</p><h2>Per-learner Viewer provision</h2></div></div>
          <div className="admin-form-grid">
            <label>Estimated Viewer cost per learner<input name="estimated_cost_per_learner" type="number" min="0" max="1000" step="0.01" defaultValue={(settings.estimatedCostPerLearnerCents / 100).toFixed(2)} required /></label>
            <label>Additional launch estimate<input name="additional_session_cost" type="number" min="0" max="1000" step="0.01" defaultValue={(settings.additionalSessionCostCents / 100).toFixed(2)} required /></label>
            <label>Tolerance on Viewer cost (%)<input name="tolerance_percent" type="number" min="0" max="100" step="0.01" defaultValue={(settings.toleranceBps / 100).toFixed(2)} required /></label>
          </div>
          {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
          {state.success ? <p className="form-success" role="status">{state.success}</p> : null}
          <button className="primary-button" disabled={pending}>{pending ? "Saving…" : "Save Scannex Viewer settings"}</button>
        </form>

        <aside className="admin-side-card viewer-cost-breakdown">
          <p className="eyebrow">Learner fee calculation</p>
          <h2>{formatCoursePrice(payablePriceCents, currency)}</h2>
          <dl>
            <div><dt>Scannex training fee</dt><dd>{formatCoursePrice(baseCoursePriceCents, currency)}</dd></div>
            <div><dt>Estimated Viewer cost</dt><dd>{formatCoursePrice(settings.estimatedCostPerLearnerCents, currency)}</dd></div>
            <div><dt>{(settings.toleranceBps / 100).toFixed(2)}% Viewer tolerance</dt><dd>{formatCoursePrice(toleranceCents, currency)}</dd></div>
            <div><dt>Total advertised fee</dt><dd><strong>{formatCoursePrice(payablePriceCents, currency)}</strong></dd></div>
          </dl>
          <p>The tolerance applies only to the Viewer cost. It is not calculated on the USD 300 training fee.</p>
          <p>{summary.uniqueLearners} unique learners have launched {summary.launchCount} Viewer sessions this month.</p>
        </aside>
      </section>
    </>
  );
}
