import { LEARNER_SCANNEX_WORKFLOW, MODES, newDocument, parseDocument, safeFilename, submissionIssues, validateFile, type CasePack,
  type FileKind, type LearnerCase, type PracticalAssignment, type PracticalFile } from "@/lib/assessments/scannex-assignment";
import { SCANNEX_TEST_CASES } from "@/lib/assessments/scannex-hosted-pilot";
import type { PracticalWorkspace } from "./PracticalAssignment";
import type { PracticalTransport } from "./practical-client";

/** Local-only test state: no fetch, browser persistence, upload, grades or submission. */
export function openScannexPilotTransport(mode: "image78" | "learner-test" = "image78"): PracticalTransport & { clearEvidence: () => void } {
  const workflowTest = mode === "learner-test";
  const ids = () => crypto.randomUUID();
  const item: LearnerCase = {
    id: ids(), number: 1, title: "Image 78 — ungraded pilot only",
    brief: "Use the pre-positioned Image 78 TIFF on the separate development desktop. Do not use learner practice.",
    sourceFileId: null,
    quality: Object.fromEntries(MODES.map(m => [m, "Adjust the view until the scan is readable."])) as LearnerCase["quality"],
  };
  const cases = workflowTest ? SCANNEX_TEST_CASES.map(number => ({ ...item, id: ids(), number,
    title: `Test Image ${number}`, brief: "Synthetic illustration for testing the workflow only. No scored finding or answer key.",
    quality: { F1: "", F2: "", F3: "", F4: "" },
  })) : [item];
  const pack: CasePack = {
    id: ids(), title: workflowTest ? "Three-exercise learner test" : "Private Image 78 pilot", status: "draft", version: "1", instructions: "",
    density_rule: "even", learner_cases: cases, calibration_notes: "", created_at: "", approved_at: null,
  };
  const assignment: PracticalAssignment = {
    id: ids(), assessment_id: ids(), pack_id: pack.id, learner_user_id: ids(), v1_run_id: ids(),
    status: "assigned", revision: 1, draft_version: 0, document: {},
    latest_submission_id: null, started_at: null, submitted_at: null,
  };
  const files: PracticalFile[] = [];
  const clips = new Map<string, { file: File; href?: string }>();
  const workspace = (): PracticalWorkspace => ({
    assignment, pack, files, name: workflowTest ? "Test Learner" : "", learningComplete: true, reference: workflowTest ? "V1-LEARNER-TEST" : "V1-IMAGE78-PILOT", submissions: [],
  });
  return {
    async request<T = unknown>(path = "", data?: unknown): Promise<T> {
      if (path !== "") throw new Error("That action is not available in the pilot.");
      if (!data) return structuredClone(workspace()) as T;
      const operation = data as { operation?: string; id?: string; document?: unknown; expectedVersion?: number; signedName?: string; declaration?: boolean };
      if (operation.id !== assignment.id) throw new Error("This is not the current pilot worksheet.");
      if (operation.operation === "start" && assignment.status === "assigned") {
        assignment.status = "draft";
        assignment.started_at = new Date().toISOString();
        assignment.document = newDocument(cases);
        return structuredClone(workspace()) as T;
      }
      if (operation.operation === "save" && assignment.status === "draft" && operation.expectedVersion === assignment.draft_version) {
        assignment.document = parseDocument(operation.document, cases);
        assignment.draft_version++;
        return structuredClone({ assignment }) as T;
      }
      if (workflowTest && operation.operation === "submit" && assignment.status === "draft" && operation.expectedVersion === assignment.draft_version) {
        if (operation.signedName !== "Test Learner" || operation.declaration !== true || submissionIssues(parseDocument(assignment.document, cases), files, LEARNER_SCANNEX_WORKFLOW).length)
          throw new Error("Finish all three test exercises and sign the test declaration before submitting.");
        assignment.status = "submitted";
        assignment.submitted_at = new Date().toISOString();
        return structuredClone(workspace()) as T;
      }
      throw new Error("The pilot cannot submit or mark results.");
    },
    async upload(file, fields, status) {
      const kind = fields.kind as FileKind;
      if (assignment.status !== "draft" || fields.assignmentId !== assignment.id || !cases.some(c => c.id === fields.caseId)
        || (kind !== "recording" && (workflowTest || kind !== "supporting_report")) || (kind === "recording" && fields.recordingNoticeAccepted !== true))
        throw new Error("Only the current pilot recording or paper checklist can be saved.");
      if (files.length >= 8) throw new Error("This tab already has eight pilot files. Save a backup before opening a new pilot.");
      validateFile(kind, file.name, file.type, file.size);
      status("Saving in this tab… Nothing will be uploaded.");
      const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const record: PracticalFile = {
        id: ids(), assignment_id: assignment.id, pack_id: null, case_id: String(fields.caseId), kind,
        original_filename: safeFilename(file.name), mime_type: file.type, size_bytes: file.size,
        status: "verified", sha256: Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join(""),
        verified_at: new Date().toISOString(),
      };
      clips.set(record.id, { file }); files.push(record);
      status("Pilot evidence saved in this tab only.");
      return record;
    },
    evidence: id => clips.get(id)?.file,
    evidenceHref(id) {
      const record = clips.get(id);
      if (record) return (record.href ??= URL.createObjectURL(record.file));
    },
    clearEvidence() {
      for (const item of clips.values()) if (item.href) URL.revokeObjectURL(item.href);
      clips.clear();
    },
  };
}
