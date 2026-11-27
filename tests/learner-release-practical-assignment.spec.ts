import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { LEARNER_SCANNEX_WORKFLOW, isUuid, MODES, REGIONS, SCANNEX_ZOOM_LEVELS, exerciseIssues, newDocument, newCandidate, newScanSequence, parseDocument, parsePackCases, packApprovalIssues, submissionIssues, validateFile, type LearnerCase, type PracticalFile } from "@/lib/assessments/scannex-assignment";
import { SCANNEX_PRACTICAL_RUBRIC, assignmentRawMax, assignmentScore } from "@/lib/assessments/scannex-practical-rubric";
import { canOpenExercise, exerciseProgress } from "@/lib/assessments/scannex-workflow";
import { PracticalLearnerDeclaration } from "@/components/assessment/PracticalExerciseFields";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const m = vi.hoisted(() => ({ session: vi.fn(), roles: vi.fn(), access: vi.fn(), rest: vi.fn(), benefits: vi.fn(), profile: vi.fn() }));
vi.mock("@/server/auth/session", () => ({ getCurrentSession: m.session, getUserRoles: m.roles, getSupabaseRestUrl: (p: string) => `https://fixture.invalid${p}` }));
vi.mock("@/server/supabase/admin-rest", () => ({ adminRest: m.rest }));
vi.mock("@/lib/services/enrolments/get-course-access", () => ({ getCourseAccess: m.access }));
vi.mock("@/server/services/course-benefits", () => ({ getBenefitState: m.benefits }));
vi.mock("@/server/services/profiles", () => ({ getProfile: m.profile }));
import { actor, accessibleFile, fileMagicMatches, learnerMutation, learnerWorkspace, ownedAssignment, requestBody, uploadMutation } from "@/server/services/practical-assignment";
import { POST, GET } from "../app/api/v1/scannex-practical/route";
import { GET as GET_ADMIN, POST as POST_ADMIN } from "../app/api/v1/scannex-practical/admin/route";
const user = "10000000-0000-4000-8000-000000000001", foreign = "10000000-0000-4000-8000-000000000002";
const cases: LearnerCase[] = [1,2,3].map(n => ({ id: `20000000-0000-4000-8000-00000000000${n}`, number: n, title: `Image ${n}`, brief: "Evaluate", sourceFileId: null, quality: { F1: "Visible detail", F2: "Visible detail", F3: "Visible detail", F4: "Visible detail" } }));
const who = { session: { user: { id: user }, accessToken: "fixture" }, admin: false };
const response = (v: unknown) => new Response(JSON.stringify(v));
beforeEach(() => { vi.resetAllMocks(); m.session.mockResolvedValue(who.session); m.roles.mockResolvedValue(["learner"]); m.access.mockResolvedValue({canAccess:true}); });
describe("electronic assignment worksheet", () => {
 it("uses the real sum of rubric limits and keeps the 32-mark contribution bounded", () => { expect(assignmentRawMax()).toBe(100); expect(assignmentScore(Object.fromEntries(SCANNEX_PRACTICAL_RUBRIC.map(r => [r.id,r.maximumScore])))).toEqual({rawScore:100,normalizedScore:100}); });
 it("creates three cases, four modes and six bottom-to-top scan regions", () => { const d = newDocument(cases); expect(d.cases).toHaveLength(3); expect(Object.keys(d.cases[0].modes)).toEqual([...MODES]); expect(Object.keys(d.cases[0].regions)).toEqual([...REGIONS]); expect(parseDocument(d,cases)).toEqual(d); });
 it("rejects case substitution and duplicate candidate identities", () => { const d = newDocument(cases); d.cases.reverse(); expect(() => parseDocument(d,cases)).toThrow(); const e = newDocument(cases); const a = newCandidate(user,"feet"); e.cases[0].candidates=[a]; e.cases[1].candidates=[a]; expect(() => parseDocument(e,cases)).toThrow(); });
 it("allows uncertainty without treating it as a correct identification", () => { const d = newDocument(cases); const a = newCandidate(user,"feet"); a.modes.F1.anomaly="uncertain"; d.cases[0].candidates=[a]; expect(parseDocument(d,cases).cases[0].candidates[0].modes.F1.anomaly).toBe("uncertain"); });
 it("does not invent F3/F4 density observations", () => { const d = newDocument(cases); const a = newCandidate(user,"feet"); a.modes.F3.density="4"; a.modes.F4.spread="even"; d.cases[0].candidates=[a]; const parsed=parseDocument(d,cases); expect(parsed.cases[0].candidates[0].modes.F3.density).toBe(""); expect(parsed.cases[0].candidates[0].modes.F4.spread).toBe(""); });
 it("flags missing evidence but never scores checkbox claims", () => { const issues = submissionIssues(newDocument(cases),[]); expect(issues).toContain("Image 1: upload a Viewer screenshot, with native annotations where applicable."); expect(issues.join(" ")).not.toMatch(/score|passed|diamond detected/i); });
 it("retains excluded candidates and still requires their reason and remarks", () => { const d=newDocument(cases); const a=newCandidate(user,"feet"); a.elimination="excluded"; d.cases[0].candidates=[a]; const issues=submissionIssues(d,[]); expect(issues.join(" ")).toContain("native annotation reference"); expect(issues.join(" ")).not.toContain("finish the electronic checklist"); });
 it("never approves three unlabelled images as an assessment key", () => { const keys=cases.map(c=>({caseId:c.id,truth:"unknown" as const,provenance:"",targets:[],expectedDecision:"review" as const})); expect(packApprovalIssues(cases,keys,"even","Owner confirmed even").length).toBeGreaterThan(0); });
 it("normalises missing source identifiers instead of serialising undefined", () => { const c=structuredClone(cases); delete (c[0] as Partial<LearnerCase>).sourceFileId; expect(parsePackCases(c)[0].sourceFileId).toBeNull(); });
 it("limits recordings to 150 MiB and other evidence to 25 MiB", () => { expect(() => validateFile("recording","clip.webm","video/webm",150*1024*1024)).not.toThrow(); expect(() => validateFile("recording","clip.webm","video/webm",150*1024*1024+1)).toThrow(); expect(() => validateFile("viewer_image","image.png","image/png",25*1024*1024+1)).toThrow(); });
 it.each(["image.svg","image.html","image.exe"])("rejects active / unsupported source %s", name => { expect(() => validateFile("case_source",name,"image/png",100)).toThrow(); });
 it("checks actual file signatures, not just extensions", () => { expect(fileMagicMatches("image/png",Buffer.from("89504e470d0a1a0a","hex"))).toBe(true); expect(fileMagicMatches("image/png",Buffer.from("<script>"))).toBe(false); expect(fileMagicMatches("video/webm",Buffer.from("1a45dfa3","hex"))).toBe(true); expect(fileMagicMatches("text/plain",Buffer.from("<html>"))).toBe(false); });
});

function guidedFixture() {
 const doc = newDocument(cases);
 doc.preparation = { viewerOpened: true, correctImages: true, systematicScan: true };
 const files: PracticalFile[] = doc.cases.map((c, i) => {
  const id = `30000000-0000-4000-8000-00000000000${i + 1}`;
  c.viewerReady = c.autoPanCompleted = c.screeningComplete = true;
  c.decision = "release";
  c.summary = "All findings explained.";
  c.scanSequence = newScanSequence();
  c.scanSequence.evidenceFileId = id;
  REGIONS.forEach((r, j) => { c.regions[r] = "no_candidate"; c.scanSequence!.completedAt[r] = `00:0${j + 1}`; });
  return { id, case_id: c.caseId, assignment_id: user, pack_id: null, kind: "recording", original_filename: "recording.webm", mime_type: "video/webm", size_bytes: 64, sha256: null, status: "verified", verified_at: null };
 });
 return { doc, files };
}

describe("three-exercise learner path", () => {
 it("unlocks 1 → 2 → 3 only after saved declarations and one separate practice check on each later exercise", () => {
  const { doc, files } = guidedFixture();
  let saved = structuredClone(doc);
  const progress = () => doc.cases.map((c, i) => exerciseProgress(c, saved.cases[i], files, i, LEARNER_SCANNEX_WORKFLOW));
  doc.cases[0].summary = "Edited, not saved yet";
  expect(canOpenExercise(1, progress())).toBe(false);
  saved = structuredClone(doc);
  expect(canOpenExercise(1, progress())).toBe(true);
  expect(canOpenExercise(2, progress())).toBe(false);
  expect(progress()[1].first).toBe("recording");
  doc.cases[1].practiceReviewed = true;
  expect(canOpenExercise(2, progress())).toBe(false);
  saved = structuredClone(doc);
  expect(canOpenExercise(2, progress())).toBe(true);
  expect(progress()[2].first).toBe("recording");
  doc.cases[2].practiceReviewed = true;
  expect(submissionIssues(parseDocument(doc, cases), files, LEARNER_SCANNEX_WORKFLOW)).toEqual([]);
  expect(submissionIssues(doc, files.slice(0,2), LEARNER_SCANNEX_WORKFLOW)).toContain("Image 3: save a verified live recording for assessor review.");
 });
 it("reveals the checklist only for Hold with an eligible body area, and saves its dropdowns", () => {
  const { doc, files } = guidedFixture(), c = doc.cases[0];
  const render = () => renderToStaticMarkup(createElement(PracticalLearnerDeclaration, { value: c, change: () => {}, item: cases[0] }));
  expect(render()).not.toContain("Which body area");
  c.decision = "hold";
  const a = newCandidate(user, "feet");
  a.annotation = "1"; a.location = "Example"; a.reason = "Unexplained"; a.remarks = "Held for review";
  c.candidates.push(a); c.regions.feet = "candidate_recorded"; c.zoomLevels = [...SCANNEX_ZOOM_LEVELS];
  expect(render()).toContain("Which body area");
  expect(render()).not.toContain("Density spread");
  expect(exerciseIssues(c, files, 0, LEARNER_SCANNEX_WORKFLOW).decision.join(" ")).toContain("select the main body area");
  c.heldRegion = "feet";
  expect(render()).toContain("E — Even");
  expect(render()).toContain("UE — Uneven");
  expect(exerciseIssues(c, files, 0, LEARNER_SCANNEX_WORKFLOW).decision.join(" ")).toContain("finish the electronic checklist");
  for (const m of MODES) {
   c.modes[m] = { used: true, tuned: true, clarity: "Readable" };
   a.modes[m] = { anomaly: "yes", structure: "uncertain", edges: "uncertain", spread: m === "F1" || m === "F2" ? "even" : "", density: m === "F1" || m === "F2" ? "3" : "" };
  }
  a.densityCheck = a.boneComparison = a.embossComparison = "Observation";
  c.summary = "Unexplained candidate in foot.";
  expect(parseDocument(doc, cases).cases[0].heldRegion).toBe("feet");
  expect(exerciseProgress(c, structuredClone(c), files, 0, LEARNER_SCANNEX_WORKFLOW).done).toBe(true);
  const saved = structuredClone(c);
  a.boneComparison = "Updated comparison";
  expect(exerciseProgress(c, saved, files, 0, LEARNER_SCANNEX_WORKFLOW).first).toBe("decision");
  c.decision = "release";
  expect(render()).not.toContain("Density spread");
  expect(parseDocument(doc, cases).cases[0].heldRegion).toBeUndefined();
  expect(exerciseIssues(c, files, 0, LEARNER_SCANNEX_WORKFLOW).decision.join(" ")).toContain("remains unresolved");
 });
});
describe("server identity, ownership and request boundaries", () => {
 it("requires a verified session", async () => { m.session.mockResolvedValue(null); expect((await GET()).status).toBe(401); expect(m.rest).not.toHaveBeenCalled(); });
 it("requires active enrolment for learners", async () => { m.access.mockResolvedValue({canAccess:false}); await expect(actor()).rejects.toThrow("ACTIVE_ENROLMENT_REQUIRED"); });
 it("does not grant admin rights from a submitted role or identity", async () => { await expect(actor(true)).rejects.toThrow("FORBIDDEN"); });
 it("denies learners both read and write access to the admin review route", async () => {
  const endpoint = `https://training.apgi.app/api/v1/scannex-practical/admin?id=${user}`;
  expect((await GET_ADMIN(new Request(endpoint))).status).toBe(403);
  expect((await POST_ADMIN(new Request(endpoint, {method:"POST",headers:{origin:"https://training.apgi.app","content-type":"application/json"},body:'{"operation":"review","role":"admin"}'}))).status).toBe(403);
  expect(m.rest).not.toHaveBeenCalled();
 });
 it("does not query or send assessor records, and returns only safe learner pack fields", async () => {
  m.benefits.mockResolvedValue({runId:user,learningComplete:true}); m.profile.mockResolvedValue({full_name:"Fixture"});
  m.rest.mockImplementation(async (url:string) => response(url.includes("v1_practical_assignments") ? [{id:user,pack_id:user,v1_run_id:user,latest_submission_id:foreign}] : url.includes("v1_practical_packs") ? [{ id:user, learner_cases:cases, answer_keys:["secret"], calibration_notes:"secret", instructions:"secret", density_rule:"even" }] : []));
  const result = await learnerWorkspace(who);
  expect(m.rest.mock.calls.map(x => x[0]).join(" ")).not.toMatch(/v1_practical_reviews|v1_practical_submissions/);
  expect(JSON.stringify(result)).not.toMatch(/secret|final_score|item_scores|density_rule|Visible detail/);
 });
 it("rejects case source downloads by learners before fetching any pack files", async () => {
  m.rest.mockResolvedValue(response([{id:user,assignment_id:null,kind:"case_source",status:"verified"}]));
  await expect(accessibleFile(who,user)).rejects.toThrow("NOT_FOUND");
  expect(m.rest).toHaveBeenCalledTimes(1);
 });
 it("rejects cross-origin mutations before reading a session", async () => { const r=new Request("https://training.apgi.app/api/v1/scannex-practical",{method:"POST",headers:{origin:"https://foreign.invalid","content-type":"application/json"},body:"{}"}); expect((await POST(r)).status).toBe(403); expect(m.session).not.toHaveBeenCalled(); });
 it("matches routed Host on an internal Next request URL", async () => { const r=new Request("https://internal.invalid/api/v1/scannex-practical",{method:"POST",headers:{host:"training.apgi.app",origin:"https://training.apgi.app","content-type":"application/json"},body:'{"operation":"start"}'}); expect(await requestBody(r)).toEqual({operation:"start"}); });
 it("bounds streamed JSON even without Content-Length", async () => { const r=new Request("https://training.apgi.app/api/v1/scannex-practical",{method:"POST",headers:{origin:"https://training.apgi.app","content-type":"application/json"},body:JSON.stringify({text:"x".repeat(512001)})}); await expect(requestBody(r)).rejects.toThrow("BODY_TOO_LARGE"); });
 it("rejects another learner's assignment without disclosing it", async () => { m.rest.mockResolvedValue(response([{id:user,learner_user_id:foreign}])); await expect(ownedAssignment(who,user)).rejects.toThrow("NOT_FOUND"); });
 it("never queries by an invalid UUID", async () => { await expect(ownedAssignment(who,"../../secrets")).rejects.toThrow(); expect(m.rest).not.toHaveBeenCalled(); expect(isUuid("../../secrets")).toBe(false); });
 it("never puts hidden answer keys or assessor calibration notes in the learner query", async () => { m.benefits.mockResolvedValue({runId:user,learningComplete:true}); m.profile.mockResolvedValue({full_name:"Fixture"}); m.rest.mockImplementation(async (url:string) => response(url.includes("v1_practical_assignments") ? [{id:user,pack_id:user,v1_run_id:user,latest_submission_id:null}] : url.includes("v1_practical_packs") ? [{id:user,learner_cases:cases}] : [])); await learnerWorkspace(who); const q=m.rest.mock.calls.map(x=>String(x[0])).find(x=>x.includes("v1_practical_packs")); expect(q).not.toContain("answer_keys"); expect(q).not.toContain("calibration_notes"); expect(q).not.toContain("select=*"); });
 it("prevents downloading another learner's submission evidence", async () => { m.rest.mockResolvedValueOnce(response([{id:user,assignment_id:user,status:"verified"}])).mockResolvedValueOnce(response([{id:user,learner_user_id:foreign}])); await expect(accessibleFile(who,user)).rejects.toThrow("NOT_FOUND"); });
 it("requires recording notice acknowledgement before reserving a video", async () => { await expect(uploadMutation(who,{operation:"reserve",kind:"recording",name:"clip.webm",mime:"video/webm",size:100,caseId:user,assignmentId:user})).rejects.toThrow("APPROVAL_REQUIRED"); expect(m.rest).not.toHaveBeenCalled(); });
 it("does not accept an arbitrary user ID in the learner mutation", async () => { m.rest.mockResolvedValueOnce(response([{id:user,learner_user_id:foreign}])); await expect(learnerMutation(who,{id:user,operation:"start",userId:foreign})).rejects.toThrow("NOT_FOUND"); });
});
it("keeps alternative evidence honest and restricts every new table and function", () => {
 const sql=readFileSync("supabase/migrations/20261125062658_v1_scannex_practical_assignment.sql","utf8");
 expect(sql).toContain("security invoker set search_path=''"); expect(sql).toContain("enable row level security"); expect(sql).toContain("from public,anon,authenticated"); expect(sql).toContain("IMMUTABLE_EVIDENCE");
 expect(sql).not.toMatch(/values\(b.id,'scannex_result'|values\(b.id,'viewer_movement_log'/); expect(sql).toContain("CERTIFICATE_GATE_CHANGED_REVIEW_REQUIRED"); expect(sql).toContain("v1_practical_evidence_complete(a.id)");
});
