import type { Course } from "@/types/course";
import { activityComplete, emptyTigerProgress, mergeWatchedRanges, tigerPolicy, watchedSeconds, TIGER_POLICY_VERSION, type TigerProgress } from "@/lib/tiger-progression";

export type ProgressRecord = { user_id: string; course_id: string; unit_id: string; status?: string; completion_status?: string; success_status?: string; progress_measure?: number | null; score_raw?: number | null; score_max?: number | null; score_scaled?: number | null; updated_at: string };
export type TigerRecord = TigerProgress & { user_id: string; course_id: string; unit_id: string; edition_key: string; policy_version: string; updated_at: string };
export type SequenceRecord = { user_id: string; course_id: string; unit_id: string; edition_key: string; document_path?: string; begun: boolean; step_count: number; through_step: number; summary_opened: boolean; updated_at: string };
export type ProgressEvidence = { learning: ProgressRecord[]; scorm: ProgressRecord[]; tiger: TigerRecord[]; sequence: SequenceRecord[]; available: boolean; detailedAvailable: boolean };
export type UnitProgressDisplay = {
  id: string; title: string; order: number; state: "Completed" | "In progress" | "Not started" | "Unavailable";
  video: string; activities: string; quiz: string; presentationPercent: number | null; lastActivityAt: string | null;
  workPercent?: number | null;
};
const boundedPercent = (value: number) => Math.max(0, Math.min(100, Math.floor(value)));
const scorePercent = (row?: ProgressRecord) => {
  if (!row) return null;
  if (typeof row.score_scaled === "number" && Number.isFinite(row.score_scaled)) return boundedPercent(row.score_scaled * 100);
  if (typeof row.score_raw === "number" && typeof row.score_max === "number" && row.score_max > 0) return boundedPercent(row.score_raw / row.score_max * 100);
  return null;
};

/** Read-only reporting projection. Never awards completion or writes learning evidence. */
export function unitProgressDisplay(course: Course, userId: string, evidence: ProgressEvidence, completedUnitIds?: ReadonlySet<string>, includeSummativeAssessment = false): UnitProgressDisplay[] {
  const edition = course.editionId ?? "legacy";
  const own = <T extends {user_id: string; course_id: string}>(rows: T[]) => rows.filter(r => r.user_id === userId && r.course_id === course.id);
  const learning = own(evidence.learning), scorm = own(evidence.scorm);
  const tiger = own(evidence.tiger).filter(r => r.edition_key === edition && r.policy_version === TIGER_POLICY_VERSION);
  const sequence = own(evidence.sequence).filter(r => r.edition_key === edition);
  return course.units.filter(u => includeSummativeAssessment || course.id !== "scannex-training-programme" || u.order <= 8).map(unit => {
    const opened = learning.find(r => r.unit_id === unit.id), attempt = scorm.find(r => r.unit_id === unit.id);
    const saved = tiger.find(r => r.unit_id === unit.id), steps = sequence.filter(r => r.unit_id === unit.id);
    // Preserve the directory's existing completion count; component details never qualify a unit.
    const complete = completedUnitIds ? completedUnitIds.has(unit.id) : opened?.status === "completed" || attempt?.completion_status === "completed";
    const started = !!opened || !!attempt || !!saved || steps.some(r => r.begun);
    const policy = tigerPolicy(course, unit), state = saved ?? emptyTigerProgress();
    const historic = complete && (!saved || state.legacy_credit === true);
    let video = "Not reported separately by this course";
    let activities = "Not reported separately by this course";
    if (policy && evidence.detailedAvailable) {
      if (historic) {
        video = "Earlier completion retained";
        activities = "Earlier completion retained";
      } else {
        try {
          const seconds = watchedSeconds(mergeWatchedRanges(state.video_ranges, policy.duration));
          video = `${boundedPercent(seconds / policy.duration * 100)}% watched · 80% required`;
        } catch { video = "Saved video detail unavailable"; }
        const done = policy.activities.filter(a => activityComplete(policy, state, a)).length;
        activities = `${done} of ${policy.activities.length} activity summaries saved`;
      }
    } else if (!evidence.detailedAvailable) {
      video = activities = "Detailed progress temporarily unavailable";
    } else if (steps.length) {
      activities = `${steps.filter(r => r.summary_opened).length} activity summaries saved`;
    }
    const current = steps.filter(r => r.begun && !r.summary_opened).sort((a,b) => b.updated_at.localeCompare(a.updated_at))[0];
    if (current && !historic && evidence.detailedAvailable) {
      const visited = Math.max(0, Math.min(current.step_count, current.through_step + 1));
      activities += ` · current activity: ${visited} of ${current.step_count} sections opened`;
    }
    const passed = saved?.quiz_passed || attempt?.success_status === "passed";
    const score = scorePercent(attempt);
    const hasResult = attempt?.success_status === "failed" || passed;
    const quiz = passed ? `Passed${score === null ? "" : ` · ${score}%`}`
      : attempt?.success_status === "failed" ? `Not yet passed${score === null ? "" : ` · latest score ${score}%`}`
      : historic ? "Earlier completion retained"
      : policy && !evidence.detailedAvailable ? "Detailed quiz progress temporarily unavailable"
      : policy ? "No pass recorded · 80% required" : hasResult ? "Result saved" : "No quiz result reported";
    const measures = [attempt?.progress_measure].filter((n): n is number => typeof n === "number" && Number.isFinite(n));
    let workPercent: number | null = !evidence.available ? null : complete ? 100 : 0;
    if (!complete && evidence.available) {
      if (policy && !evidence.detailedAvailable) workPercent = null;
      else if (policy) {
        try {
          // One equal share per required video, activity and quiz. Watching the
          // required 80% fulfils the video share; only a saved pass fulfils quiz.
          const videoShare = Math.min(1, watchedSeconds(mergeWatchedRanges(state.video_ranges, policy.duration)) / (policy.duration * .8));
          const activitiesShare = policy.activities.reduce((sum, activity, index) => {
            if (activityComplete(policy, state, activity)) return sum + 1;
            // Tiger's ordered web objects correspond to the manifest activities.
            // The summary is an additional step; visiting all sections alone
            // cannot fulfil an activity's requirement.
            const step = steps.find(s => s.begun && s.step_count > 0 && s.document_path?.endsWith(`/data/wo${index+1}/index.html`));
            return sum + (step ? Math.max(0, Math.min(step.step_count, step.through_step + 1)) / (step.step_count + 1) : 0);
          }, 0);
          workPercent = Math.min(99.9, (videoShare + activitiesShare + (state.quiz_passed ? 1 : 0)) / (policy.activities.length + 2) * 100);
        } catch { workPercent = null; }
      } else if (measures.length) workPercent = Math.max(0, Math.min(99.9, measures[0] * 100));
    }
    return { id: unit.id, title: unit.title, order: unit.order,
      state: complete ? "Completed" : !evidence.available ? "Unavailable" : started ? "In progress" : "Not started",
      video, activities, quiz, workPercent,
      presentationPercent: measures.length ? boundedPercent(measures[0] * 100) : null,
      lastActivityAt: [opened?.updated_at, attempt?.updated_at, saved?.updated_at, ...steps.map(r => r.updated_at)].filter((v): v is string => !!v).sort().at(-1) ?? null };
  });
}

/** Display-only estimate. It never changes saved completion or eligibility. */
export function overallLearningProgress(units: UnitProgressDisplay[]): number | null {
  if (!units.length) return 0;
  if (units.every(u => u.state === "Completed")) return 100;
  if (units.some(u => u.state === "Unavailable" || u.workPercent === null)) return null;
  const value = units.reduce((sum,u) => sum + (u.state === "Completed" ? 100 : u.workPercent ?? 0), 0) / units.length;
  return value > 0 ? Math.max(.1, Math.min(99.9, Math.round(value * 10) / 10)) : 0;
}

export const OVERALL_PROGRESS_HELP = "Each unit has an equal share. Tiger includes progress toward the 80% video requirement, activity sections and summaries, and a quiz share awarded on a pass. Other courses use their saved presentation percentage. This estimate does not award unit completion or a certificate.";

