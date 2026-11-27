// Shared worksheet rules, not a material classifier or a learner self-grading engine.
export const PRACTICAL_VERSION = "scannex-practical-assignment-v1-20261125";
export const RECORDING_NOTICE_VERSION = "scannex-recording-v1-20261125";
export const PRACTICAL_PATH = "/learn/scannex-training-programme/units/lu9/viewer-lab";
export const PRACTICAL_API = "/api/v1/scannex-practical";
export const MODES = ["F1", "F2", "F3", "F4"] as const;
export const SCANNEX_ZOOM_LEVELS = ["¼×", "½×", "1×", "2×", "4×"] as const;
export type ScannexZoomLevel = typeof SCANNEX_ZOOM_LEVELS[number];
export const REGIONS = ["feet", "lower_legs", "pelvis_hands", "abdomen_lower_arm", "chest_upper_arm", "head"] as const;
export const REGION_LABELS: Record<Region, string> = {
  feet: "Feet", lower_legs: "Lower legs / knees", pelvis_hands: "Pelvis / hands",
  abdomen_lower_arm: "Abdomen / lower arm", chest_upper_arm: "Chest / upper arm", head: "Head"
};
export type Mode = typeof MODES[number];
export type Region = typeof REGIONS[number];
export type DensityRule = "even" | "uneven" | "review_required";
export type Decision = "hold" | "release" | "review";
export type Observation = { anomaly: string; structure: string; edges: string; spread: string; density: string };
export type Candidate = {
  id: string; annotation: string; region: Region; location: string;
  elimination: "evaluate" | "excluded" | "uncertain"; reason: string; remarks: string;
  modes: Record<Mode, Observation>; densityCheck: string; boneComparison: string;
  embossComparison: string; position: "inside" | "outside" | "uncertain"; decision: Decision;
};
export type ScanSequence = {
  evidenceFileId: string | null;
  completedAt: Record<Region, string>;
};
export type CaseWorksheet = {
  caseId: string; modes: Record<Mode, { used: boolean; tuned: boolean; clarity: string }>;
  regions: Record<Region, "not_reviewed" | "no_candidate" | "candidate_recorded">;
  // Guided V1 readiness declaration. Older drafts and snapshots may omit it.
  viewerReady?: boolean;
  autoPanCompleted?: boolean;
  screeningComplete?: boolean;
  zoomLevels?: ScannexZoomLevel[];
  checklistSource?: "electronic" | "paper";
  practiceReviewed?: boolean;
  heldRegion?: Region;
  // Optional in older frozen submissions. Required for new submission.
  scanSequence?: ScanSequence;
  candidates: Candidate[]; summary: string; decision: Decision;
};
export type AssignmentDocument = { version: string; preparation: { viewerOpened: boolean; correctImages: boolean; systematicScan: boolean }; cases: CaseWorksheet[] };
export type LearnerCase = {
  id: string; number: number; title: string; brief: string; sourceFileId: string | null;
  quality: Record<Mode, string>;
};
export type AnswerKey = { caseId: string; truth: "unknown" | "confirmed_negative" | "confirmed_diamond"; provenance: string; targets: string[]; expectedDecision: Decision };
export type CasePack = {
  id: string; title: string; status: "draft" | "approved" | "retired"; version: string;
  instructions: string; density_rule: DensityRule; learner_cases: LearnerCase[];
  calibration_notes: string; created_at: string; approved_at: string | null;
};
export type PracticalAssignment = {
  id: string; assessment_id: string; pack_id: string; learner_user_id: string; v1_run_id: string;
  status: "assigned" | "draft" | "submitted" | "changes_requested" | "assessed";
  revision: number; draft_version: number; document: AssignmentDocument | Record<string, never>;
  latest_submission_id: string | null; started_at: string | null; submitted_at: string | null;
};
export const FILE_KINDS = ["case_source", "viewer_image", "recording", "native_log", "native_result", "supporting_report"] as const;
export type FileKind = typeof FILE_KINDS[number];
export type PracticalFile = {
  id: string; assignment_id: string | null; pack_id: string | null; case_id: string;
  kind: FileKind; original_filename: string; mime_type: string; size_bytes: number;
  sha256: string | null; status: "pending" | "verified"; verified_at: string | null;
};
export const RECORDING_NOTICE = "Record only your Scannex assessment window or tab. Sign in to AWS and Scannex before recording. Do not record passwords, email, other learners, microphone or webcam. APGI will retain the assessment recording and submitted files privately for assessor review and the assessment audit trail. AI suggestions, if introduced later with notice, will not replace the assessor's final decision.";
export const INTEGRITY_DECLARATION = "I confirm that this is my own practical work, that the evidence relates to the assigned images, and that I have not knowingly altered or substituted the evidence. My worksheet is a submission for assessor review, not a self-awarded result.";

export function isUuid(value: unknown): value is string { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
export function text(value: unknown, max = 4000) {
  if (value == null) return "";
  if (typeof value !== "string" || value.length > max) throw new Error("INVALID_WORKSHEET");
  return value.trim();
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_WORKSHEET");
  return value as Record<string, unknown>;
}
function choice<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new Error("INVALID_WORKSHEET");
  return value as T;
}
const decision = (v: unknown) => choice(v, ["hold", "release", "review"] as const, "review");
export function newScanSequence(): ScanSequence {
  return { evidenceFileId: null, completedAt: Object.fromEntries(REGIONS.map(r => [r, ""])) as ScanSequence["completedAt"] };
}
export function elapsedScanSeconds(value: string) {
  const time = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
  return time ? Number(time[1]) * 60 + Number(time[2]) : null;
}
export function scanSequenceOrder(sequence?: ScanSequence): "incomplete" | "in_order" | "review" {
  if (!sequence) return "incomplete";
  const times = REGIONS.map(r => elapsedScanSeconds(sequence.completedAt[r]));
  if (times.some(t => t === null)) return "incomplete";
  return times.every((t, i) => i === 0 || t! > times[i - 1]!) ? "in_order" : "review";
}
export function scanTimingEvidence(files: PracticalFile[], caseId: string) {
  return files.filter(f => f.case_id === caseId && f.status === "verified" && (f.kind === "recording" || f.kind === "native_log"));
}
function parseScanSequence(value: unknown): ScanSequence {
  const s = object(value), completedAt = object(s.completedAt), evidenceFileId = s.evidenceFileId ?? null;
  if (evidenceFileId !== null && !isUuid(evidenceFileId)) throw new Error("INVALID_WORKSHEET");
  // Keep bounded, partially entered offsets in drafts; submission requires valid times.
  return { evidenceFileId, completedAt: Object.fromEntries(REGIONS.map(r => [r, text(completedAt[r], 5)])) as ScanSequence["completedAt"] };
}
export function newDocument(cases: LearnerCase[]): AssignmentDocument {
  return { version: PRACTICAL_VERSION, preparation: { viewerOpened: false, correctImages: false, systematicScan: false }, cases: cases.map(c => ({
    caseId: c.id, modes: Object.fromEntries(MODES.map(m => [m, { used: false, tuned: false, clarity: "" }])) as CaseWorksheet["modes"],
    regions: Object.fromEntries(REGIONS.map(r => [r, "not_reviewed"])) as CaseWorksheet["regions"],
    scanSequence: newScanSequence(), candidates: [], summary: "", decision: "review"
  })) };
}
export function newCandidate(id: string, region: Region): Candidate {
  return { id, region, annotation: "", location: "", elimination: "evaluate", reason: "", remarks: "",
    modes: Object.fromEntries(MODES.map(m => [m, { anomaly: "", structure: "", edges: "", spread: "", density: "" }])) as Candidate["modes"],
    densityCheck: "", boneComparison: "", embossComparison: "", position: "uncertain", decision: "review" };
}

export function parseDocument(input: unknown, cases: LearnerCase[]): AssignmentDocument {
  const root = object(input), prep = object(root.preparation);
  if (root.version !== PRACTICAL_VERSION || !Array.isArray(root.cases) || root.cases.length !== cases.length) throw new Error("INVALID_WORKSHEET");
  const seen = new Set<string>();
  const result: AssignmentDocument = { version: PRACTICAL_VERSION,
    preparation: { viewerOpened: prep.viewerOpened === true, correctImages: prep.correctImages === true, systematicScan: prep.systematicScan === true },
    cases: root.cases.map((raw, i) => {
      const c = object(raw), modes = object(c.modes), regions = object(c.regions);
      if (c.caseId !== cases[i].id || !Array.isArray(c.candidates) || c.candidates.length > 40) throw new Error("INVALID_WORKSHEET");
      return { caseId: cases[i].id,
        ...(typeof c.viewerReady === "boolean" ? { viewerReady: c.viewerReady } : {}),
        ...(typeof c.autoPanCompleted === "boolean" ? { autoPanCompleted: c.autoPanCompleted } : {}),
        ...(typeof c.screeningComplete === "boolean" ? { screeningComplete: c.screeningComplete } : {}),
        ...(typeof c.practiceReviewed === "boolean" ? { practiceReviewed: c.practiceReviewed } : {}),
        ...(c.decision === "hold" && c.heldRegion != null && c.heldRegion !== "" ? { heldRegion: choice(c.heldRegion, REGIONS, "feet") } : {}),
        ...(Array.isArray(c.zoomLevels) ? { zoomLevels: SCANNEX_ZOOM_LEVELS.filter(level => (c.zoomLevels as unknown[]).includes(level)) } : {}),
        ...(c.checklistSource === "paper" || c.checklistSource === "electronic" ? { checklistSource: c.checklistSource } : {}),
        modes: Object.fromEntries(MODES.map(m => { const v = object(modes[m]); return [m, { used: v.used === true, tuned: v.tuned === true, clarity: text(v.clarity, 1000) }]; })) as CaseWorksheet["modes"],
        regions: Object.fromEntries(REGIONS.map(r => [r, choice(regions[r], ["not_reviewed", "no_candidate", "candidate_recorded"] as const, "not_reviewed")])) as CaseWorksheet["regions"],
        ...(c.scanSequence === undefined ? {} : { scanSequence: parseScanSequence(c.scanSequence) }),
        candidates: c.candidates.map(rawCandidate => {
          const a = object(rawCandidate), am = object(a.modes);
          if (!isUuid(a.id) || seen.has(a.id)) throw new Error("INVALID_WORKSHEET"); seen.add(a.id);
          return { id: a.id, annotation: text(a.annotation, 100), region: choice(a.region, REGIONS, "abdomen_lower_arm"), location: text(a.location, 1000),
            elimination: choice(a.elimination, ["evaluate", "excluded", "uncertain"] as const, "uncertain"), reason: text(a.reason), remarks: text(a.remarks),
            modes: Object.fromEntries(MODES.map(m => { const v = object(am[m]); return [m, {
              anomaly: choice(v.anomaly, ["", "yes", "no", "uncertain"] as const, ""),
              structure: choice(v.structure, ["", "unstructured", "structured", "uncertain"] as const, ""),
              edges: choice(v.edges, ["", "undefined", "defined", "uncertain"] as const, ""),
              spread: m === "F1" || m === "F2" ? choice(v.spread, ["", "even", "uneven", "uncertain"] as const, "") : "",
              density: m === "F1" || m === "F2" ? choice(v.density, ["", "1", "2", "3", "4", "5", "6", "uncertain"] as const, "") : ""
            }]; })) as Candidate["modes"],
            densityCheck: text(a.densityCheck), boneComparison: text(a.boneComparison), embossComparison: text(a.embossComparison),
            position: choice(a.position, ["inside", "outside", "uncertain"] as const, "uncertain"), decision: decision(a.decision) };
        }), summary: text(c.summary), decision: decision(c.decision)
      };
    }) };
  return result;
}

export const EXERCISE_STEPS = ["viewer", "recording", "evidence", "scan", "findings", "decision"] as const;
export type ExerciseStep = typeof EXERCISE_STEPS[number];
export type ExerciseEvidencePolicy = { requireScreenshot?: boolean; orderedReview?: boolean; guidedDeclaration?: boolean };
export const RECORDING_ONLY_PREVIEW = { requireScreenshot: false } as const;
export const ORDERED_SCANNEX_PREVIEW = { requireScreenshot: false, orderedReview: true } as const;
export const LEARNER_SCANNEX_WORKFLOW = { ...ORDERED_SCANNEX_PREVIEW, guidedDeclaration: true } as const;

export function requiresExercisePractice(index: number, policy?: ExerciseEvidencePolicy) {
  return policy?.guidedDeclaration === true && index > 0;
}

export function hasPaperChecklist(c: CaseWorksheet, files: PracticalFile[]) {
  return files.some(f => f.case_id === c.caseId && f.status === "verified" && f.kind === "supporting_report");
}

export function applySingleTimingSource(c: CaseWorksheet, files: PracticalFile[]) {
  const sources = scanTimingEvidence(files, c.caseId);
  if (sources.length !== 1 || c.scanSequence?.evidenceFileId) return c;
  return { ...c, scanSequence: { ...(c.scanSequence ?? newScanSequence()), evidenceFileId: sources[0].id } };
}

// Completeness only. A saved selection is neither native telemetry nor an assessor decision.
export function exerciseIssues(c: CaseWorksheet, files: PracticalFile[], i: number, policy: ExerciseEvidencePolicy = {}): Record<ExerciseStep, string[]> {
    const label = `Image ${i + 1}`;
    const issues: Record<ExerciseStep, string[]> = { viewer: [], recording: [], evidence: [], scan: [], findings: [], decision: [] };
    if (!c.viewerReady) issues.viewer.push(`${label}: confirm the assigned exercise is visible in the assessment Viewer.`);
    const timingSources = scanTimingEvidence(files, c.caseId).filter(f => !policy.guidedDeclaration || f.kind === "recording");
    if (!timingSources.length) issues.recording.push(`${label}: save a verified ${policy.guidedDeclaration ? "live recording" : "recording or native log"} for assessor review.`);
    if (requiresExercisePractice(i, policy) && !c.practiceReviewed) issues.recording.push(`${label}: record and check one practice clip before the live run.`);
    if (policy.requireScreenshot !== false && !files.some(f => f.case_id === c.caseId && f.status === "verified" && f.kind === "viewer_image"))
      issues.evidence.push(`${label}: upload a Viewer screenshot, with native annotations where applicable.`);
    const retained = c.candidates.filter(a => a.elimination !== "excluded");
    const paper = policy.orderedReview && !policy.guidedDeclaration && c.checklistSource === "paper";
    const heldCandidates = retained.filter(a => a.decision !== "release");
    const checklistStep = policy.guidedDeclaration ? issues.decision : issues.findings;
    if (policy.orderedReview) {
      if (!c.autoPanCompleted) issues.scan.push(`${label}: confirm you used Auto Pan to inspect the entire image.`);
      if (!c.screeningComplete) issues.findings.push(`${label}: confirm you finished screening and explained any exclusions.`);
      if (retained.length && !SCANNEX_ZOOM_LEVELS.every(level => c.zoomLevels?.includes(level)))
        issues.findings.push(`${label}: demonstrate and confirm all five Viewer zoom levels on the flagged finding.`);
      if (retained.length && paper && !hasPaperChecklist(c, files)) issues.findings.push(`${label}: attach the completed paper checklist to this exercise.`);
      if (c.decision === "review") issues.decision.push(`${label}: choose Hold or Release to finish the exercise.`);
      if (c.decision === "release" && retained.some(a => a.decision !== "release")) issues.decision.push(`${label}: use Hold if a flagged candidate remains unresolved.`);
      if (policy.guidedDeclaration && c.decision === "hold") {
        if (!c.heldRegion) issues.decision.push(`${label}: select the main body area that led to Hold.`);
        else if (!heldCandidates.some(a => a.region === c.heldRegion)) issues.decision.push(`${label}: record a flagged candidate in the selected body area, and do not mark it ruled out.`);
      }
    }
    if (!policy.orderedReview || (retained.length && !paper && (!policy.guidedDeclaration || c.decision === "hold"))) MODES.forEach(m => {
      if (!c.modes[m].used || !c.modes[m].tuned || !c.modes[m].clarity.trim()) (policy.orderedReview ? checklistStep : issues.scan).push(`${label}: describe your use and optimisation of ${m}.`);
    });
    REGIONS.forEach(r => {
      if (c.regions[r] === "not_reviewed") issues.scan.push(`${label}: record the ${REGION_LABELS[r]} scan outcome.`);
      else if ((c.regions[r] === "candidate_recorded") !== c.candidates.some(a => a.region === r))
        issues.findings.push(`${label}: reconcile the ${REGION_LABELS[r]} region record with your candidates.`);
    });
    const sequence = c.scanSequence;
    if (!sequence?.evidenceFileId || !timingSources.some(f => f.id === sequence.evidenceFileId))
      issues.scan.push(`${label}: choose a verified ${policy.guidedDeclaration ? "recording" : "recording or native log"} from this image as the scan timing source.`);
    const missingCheckpoints = REGIONS.filter(r => elapsedScanSeconds(sequence?.completedAt[r] ?? "") === null);
    if (missingCheckpoints.length)
      issues.scan.push(`${label}: enter an MM:SS scan checkpoint for ${missingCheckpoints.map(r => REGION_LABELS[r]).join(", ")}.`);
    if (!c.summary.trim()) issues.decision.push(`${label}: add your reasoned conclusion.`);
    c.candidates.forEach((a, index) => {
      if (!a.annotation.trim() || !a.location.trim() || !a.remarks.trim())
        issues.findings.push(`${label}, candidate ${index + 1}: add the native annotation reference, location and Viewer remarks.`);
      if (!a.reason.trim()) issues.findings.push(`${label}, candidate ${index + 1}: explain why you retained, excluded or could not resolve this candidate.`);
      if (a.elimination !== "excluded" && !paper && (!policy.guidedDeclaration || (c.decision === "hold" && a.decision !== "release"))) {
        if (MODES.some(m => !a.modes[m].anomaly || !a.modes[m].structure || !a.modes[m].edges)
          || ["F1", "F2"].some(m => !a.modes[m as Mode].spread || !a.modes[m as Mode].density)
          || !a.densityCheck.trim() || !a.boneComparison.trim() || !a.embossComparison.trim())
          checklistStep.push(`${label}, candidate ${index + 1}: finish the electronic checklist; use uncertain where necessary.`);
      }
    });
    return issues;
}

export function submissionIssues(doc: AssignmentDocument, files: PracticalFile[], policy?: ExerciseEvidencePolicy): string[] {
  const issues: string[] = [];
  if (Object.values(doc.preparation).some(v => !v)) issues.push("Complete the preparation declarations.");
  doc.cases.forEach((c, i) => {
    const perStep = exerciseIssues(c, files, i, policy);
    for (const step of EXERCISE_STEPS) {
      // Existing worksheets can predate the guided viewer acknowledgement.
      if (step !== "viewer" || policy?.guidedDeclaration || c.viewerReady !== undefined) issues.push(...perStep[step]);
    }
  });
  return issues;
}

export function parsePackCases(input: unknown): LearnerCase[] {
  if (!Array.isArray(input) || input.length !== 3) throw new Error("THREE_CASES_REQUIRED");
  const ids = new Set<string>();
  return input.map((raw, i) => { const c = object(raw), q = object(c.quality);
    if (!isUuid(c.id) || ids.has(c.id) || (c.sourceFileId != null && !isUuid(c.sourceFileId))) throw new Error("INVALID_CASE_SET"); ids.add(c.id);
    return { id: c.id, number: i + 1, title: text(c.title, 150), brief: text(c.brief), sourceFileId: (c.sourceFileId ?? null) as string | null,
      quality: Object.fromEntries(MODES.map(m => [m, text(q[m], 2000)])) as LearnerCase["quality"] };
  });
}
export function parseAnswerKeys(input: unknown, cases: LearnerCase[]): AnswerKey[] {
  if (!Array.isArray(input) || input.length !== 3) throw new Error("INVALID_CASE_SET");
  return input.map((raw, i) => { const k = object(raw);
    if (k.caseId !== cases[i].id || !Array.isArray(k.targets) || k.targets.length > 40) throw new Error("INVALID_CASE_SET");
    return { caseId: cases[i].id, truth: choice(k.truth, ["unknown", "confirmed_negative", "confirmed_diamond"] as const, "unknown"),
      provenance: text(k.provenance), targets: k.targets.map(t => text(t, 2000)).filter(Boolean), expectedDecision: decision(k.expectedDecision) };
  });
}
export function packApprovalIssues(cases: LearnerCase[], keys: AnswerKey[], densityRule: DensityRule, calibration: string) {
  const issues: string[] = [];
  if (densityRule === "review_required" || !calibration.trim()) issues.push("Resolve the density-spread interpretation and record calibration notes.");
  cases.forEach((c, i) => {
    const k = keys[i];
    if (!c.title || !c.brief || !c.sourceFileId || MODES.some(m => !c.quality[m])) issues.push(`Image ${i + 1}: source, instructions and all four clarity criteria are required.`);
    if (!k?.provenance || k.truth !== (i === 0 ? "confirmed_negative" : "confirmed_diamond") || (i === 0 ? k.targets.length !== 0 : k.targets.length < 1)) issues.push(`Image ${i + 1}: confirm the ${i === 0 ? "negative control" : "diamond-positive case"} and hidden reference findings.`);
  });
  return issues;
}
export const MIME_EXTENSIONS: Record<string, string[]> = {
  "image/png": ["png"], "image/jpeg": ["jpg", "jpeg"], "image/tiff": ["tif", "tiff"],
  "application/pdf": ["pdf"], "video/webm": ["webm"], "video/mp4": ["mp4"],
  "text/plain": ["txt", "log", "csv"], "application/json": ["json"]
};
export function uploadLimit(kind: FileKind) { return kind === "recording" ? 150 * 1024 * 1024 : 25 * 1024 * 1024; }
export function validateFile(kind: FileKind, name: string, mime: string, size: number) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (!FILE_KINDS.includes(kind) || !MIME_EXTENSIONS[mime]?.includes(ext) || !Number.isSafeInteger(size) || size < 1 || size > uploadLimit(kind)) throw new Error("FILE_NOT_ALLOWED");
  if (["case_source", "viewer_image"].includes(kind) && !mime.startsWith("image/")) throw new Error("FILE_NOT_ALLOWED");
  if (kind === "recording" && !mime.startsWith("video/")) throw new Error("FILE_NOT_ALLOWED");
  if (["native_log", "native_result", "supporting_report"].includes(kind) && mime.startsWith("video/")) throw new Error("FILE_NOT_ALLOWED");
}
export function safeFilename(name: string) { return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-140) || "evidence"; }
