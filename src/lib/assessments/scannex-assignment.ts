// Shared worksheet rules, not a material classifier or a learner self-grading engine.
import { SCANNEX_PRACTICAL_RUBRIC } from "./scannex-practical-rubric";
export const PRACTICAL_VERSION = "scannex-practical-assignment-v1-20261125";
export const ASSIGNMENT_RUBRIC_VERSION = "scannex-practical-v1-even-density-20261125";
export const ASSIGNMENT_RAW_MAX = SCANNEX_PRACTICAL_RUBRIC.reduce((n, c) => n + c.maximumScore, 0);
export function assignmentScore(scores: Record<string, number>) {
  const rawScore = SCANNEX_PRACTICAL_RUBRIC.reduce((n, c) => n + (scores[c.id] ?? 0), 0);
  return { rawScore, normalizedScore: Math.round(rawScore / ASSIGNMENT_RAW_MAX * 10000) / 100 };
}
export const RECORDING_NOTICE_VERSION = "scannex-recording-v1-20261125";
export const PRACTICAL_PATH = "/learn/scannex-training-programme/units/lu9/viewer-lab";
export const PRACTICAL_API = "/api/v1/scannex-practical";
export const MODES = ["F1", "F2", "F3", "F4"] as const;
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
export type CaseWorksheet = {
  caseId: string; modes: Record<Mode, { used: boolean; tuned: boolean; clarity: string }>;
  regions: Record<Region, "not_reviewed" | "no_candidate" | "candidate_recorded">;
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
export function newDocument(cases: LearnerCase[]): AssignmentDocument {
  return { version: PRACTICAL_VERSION, preparation: { viewerOpened: false, correctImages: false, systematicScan: false }, cases: cases.map(c => ({
    caseId: c.id, modes: Object.fromEntries(MODES.map(m => [m, { used: false, tuned: false, clarity: "" }])) as CaseWorksheet["modes"],
    regions: Object.fromEntries(REGIONS.map(r => [r, "not_reviewed"])) as CaseWorksheet["regions"], candidates: [], summary: "", decision: "review"
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
        modes: Object.fromEntries(MODES.map(m => { const v = object(modes[m]); return [m, { used: v.used === true, tuned: v.tuned === true, clarity: text(v.clarity, 1000) }]; })) as CaseWorksheet["modes"],
        regions: Object.fromEntries(REGIONS.map(r => [r, choice(regions[r], ["not_reviewed", "no_candidate", "candidate_recorded"] as const, "not_reviewed")])) as CaseWorksheet["regions"],
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

// These are completeness checks only. Mode checkboxes are learner claims, NOT native telemetry.
// Wrong answers remain assessable; uncertainty never becomes an automatic positive or pass.
export function submissionIssues(doc: AssignmentDocument, files: PracticalFile[]): string[] {
  const issues: string[] = [];
  if (Object.values(doc.preparation).some(v => !v)) issues.push("Complete the preparation declarations.");
  doc.cases.forEach((c, i) => {
    const label = `Image ${i + 1}`;
    MODES.forEach(m => { if (!c.modes[m].used || !c.modes[m].tuned || !c.modes[m].clarity) issues.push(`${label}: describe your use and optimisation of ${m}.`); });
    REGIONS.forEach(r => {
      const found = c.candidates.some(a => a.region === r);
      if (c.regions[r] === "not_reviewed" || (c.regions[r] === "candidate_recorded") !== found) issues.push(`${label}: reconcile the ${REGION_LABELS[r]} region record.`);
    });
    if (!c.summary) issues.push(`${label}: add your reasoned conclusion.`);
    c.candidates.forEach((a, index) => {
      if (!a.annotation || !a.location || !a.reason || !a.remarks) issues.push(`${label}, candidate ${index + 1}: add the native annotation reference, location, reasons and remarks.`);
      if (a.elimination !== "excluded") {
        if (MODES.some(m => !a.modes[m].anomaly || !a.modes[m].structure || !a.modes[m].edges)
          || ["F1", "F2"].some(m => !a.modes[m as Mode].spread || !a.modes[m as Mode].density)
          || !a.densityCheck || !a.boneComparison || !a.embossComparison) issues.push(`${label}, candidate ${index + 1}: finish the electronic checklist; use uncertain where necessary.`);
      }
    });
    const evidence = files.filter(f => f.case_id === c.caseId && f.status === "verified");
    if (!evidence.some(f => f.kind === "viewer_image")) issues.push(`${label}: upload a Viewer screenshot, with native annotations where applicable.`);
    if (!evidence.some(f => f.kind === "recording" || f.kind === "native_log")) issues.push(`${label}: provide a recording or an exported native action log for assessor review.`);
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
