import { EXERCISE_STEPS, exerciseIssues, type CaseWorksheet, type ExerciseEvidencePolicy, type ExerciseStep, type PracticalFile } from "./scannex-assignment";

export const RECORDING_ONLY_STEPS = EXERCISE_STEPS.filter(step => step !== "evidence");

export const STEP_COPY: Record<ExerciseStep, { title: string; instruction: string }> = {
  viewer: { title: "Connect & confirm", instruction: "Open the assessment Viewer connection provided with your booking, using the same sign-in steps as in training. Select this preloaded exercise in the Viewer and check its reference before recording." },
  recording: { title: "Record the exercise", instruction: "Start recording first. In the separate Viewer, follow your printed checklist: scan from feet to head, note the six region times, adjust F1–F4, zoom where needed, annotate and comment, then evaluate and decide. Stop and save before changing images." },
  evidence: { title: "Attach a screenshot", instruction: "Save a clear screenshot from this exercise. Include your native annotations if you made any. The recording shows your actions; a screenshot alone cannot show their order." },
  scan: { title: "Enter the scan checks", instruction: "Record how you used and adjusted each mode, choose the recording or approved log, and enter the six elapsed checkpoint times and scan outcomes. Use the actual times, even if the order needs review." },
  findings: { title: "Record candidate findings", instruction: "For each candidate, enter its annotation, location, comment and reason. An obvious lookalike only needs a documented exclusion. Complete the electronic checklist for each retained or uncertain candidate." },
  decision: { title: "Explain your decision", instruction: "Choose Hold, Release or Review for this exercise and explain how the evidence supports it. If you cannot resolve a finding or obtain enough detail, choose Review rather than guessing." },
};

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const props = value as Record<string, unknown>;
    return `{${Object.keys(props).sort().map(k => `${JSON.stringify(k)}:${stable(props[k])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function draftPart(value: CaseWorksheet, step: ExerciseStep) {
  switch (step) {
    case "viewer": return value.viewerReady;
    case "scan": return [value.modes, value.regions, value.scanSequence, value.autoPanCompleted];
    case "findings": return [value.candidates, value.regions, value.screeningComplete, value.checklistSource, value.modes, value.zoomLevels];
    case "decision": return [value.decision, value.summary];
    // These are verified independently of the worksheet, by the evidence API.
    case "recording": case "evidence": return null;
  }
}

export function exerciseProgress(value: CaseWorksheet, saved: CaseWorksheet | undefined, files: PracticalFile[], index: number, policy?: ExerciseEvidencePolicy) {
  const issues = exerciseIssues(value, files, index, policy);
  const completed = (step: ExerciseStep) => issues[step].length === 0 &&
    (step === "recording" || step === "evidence" || (saved !== undefined && stable(draftPart(value, step)) === stable(draftPart(saved, step))));
  let priorStepsSaved = true;
  const steps = Object.fromEntries(EXERCISE_STEPS.map(step => {
    const done = priorStepsSaved && completed(step);
    priorStepsSaved = done;
    return [step, { issues: issues[step], done }];
  })) as
    Record<ExerciseStep, { issues: string[]; done: boolean }>;
  const first = EXERCISE_STEPS.find(step => !steps[step].done);
  return { steps, done: !first, first: first ?? "decision" };
}
