import { describe, expect, it } from "vitest";
import { parsePracticalCase, publicCaseInstructions, scorePractical } from "../../src/lib/assessments/automated-practical";
import { calculateScannexPracticalScore, SCANNEX_PRACTICAL_RAW_MAX_SCORE } from "../../src/lib/assessments/scannex-practical-rubric";
import { fixture } from "./fixtures";

describe("automated Scannex marking", () => {
  it("scores all 21 items out of 100 and combines 32 practical with 68 theory", () => {
    const { definition, native, checklist } = fixture();
    const result = scorePractical(definition, native, checklist, 68, true);
    expect(result).toMatchObject({ status: "passed", practicalScore: 100, practicalMaximum: 100, practicalContribution: 32, finalScore: 100, version: "scannex-practical-v2" });
    expect(result.items).toHaveLength(21);
  });
  it("preserves legacy 99-mark calculations", () => {
    expect(SCANNEX_PRACTICAL_RAW_MAX_SCORE).toBe(99);
    expect(calculateScannexPracticalScore({ four_viewing_modes: 4 })).toEqual({ rawScore: 4, normalizedScore: 4.04 });
  });
  it("awards explicit partial credit", () => {
    const { definition, native, checklist } = fixture();
    definition.checks = definition.checks.flatMap(c => c.id === "contrast_density" ? [{ ...c, marks: 3 }, { ...c, id: "contrast_density_second", field: "density_second", marks: 2 }] : [c]);
    native.density_second = false;
    expect(scorePractical(definition, native, checklist, 60, true)).toMatchObject({ practicalScore: 98, practicalContribution: 31.36, finalScore: 91.36, status: "passed" });
  });
  it("fails a safety-critical action even above the overall pass mark", () => {
    const { definition, native, checklist } = fixture(); native.correct_actions_recorded = false;
    expect(scorePractical(definition, native, checklist, 68, true)).toMatchObject({ practicalScore: 96, finalScore: 98.72, safetyFailure: true, status: "failed" });
  });
  it.each([43, 42.99])("uses the 75 overall threshold with theory=%s", theory => {
    const { definition, native, checklist } = fixture();
    expect(scorePractical(definition, native, checklist, theory, true).status).toBe(theory === 43 ? "passed" : "failed");
  });
  it("records explicit wrong observations as zero without treating them as lost evidence", () => {
    const { definition, native, checklist } = fixture(); for (const key of Object.keys(native)) native[key] = false; checklist.conclusion = "clear"; checklist.signed = false;
    expect(scorePractical(definition, native, checklist, 0, true)).toMatchObject({ status: "failed", practicalScore: 0, finalScore: 0 });
  });
  it.each(["missing", "wrong-type", "capture-gap", "checklist-missing"])("leaves %s evidence incomplete with no score", situation => {
    const { definition, native, checklist } = fixture();
    if (situation === "missing") delete native.systematic_scan;
    if (situation === "wrong-type") native.systematic_scan = "true";
    if (situation === "checklist-missing") delete checklist.signed;
    expect(scorePractical(definition, native, checklist, 68, situation !== "capture-gap")).toMatchObject({ status: "incomplete", practicalScore: null, finalScore: null });
  });
  it("does not permit browser checklist values to substitute for native proof", () => {
    const { definition, native, checklist } = fixture();
    delete native.systematic_scan; checklist.systematic_scan = true;
    expect(scorePractical(definition, native, checklist, 68, true).status).toBe("incomplete");
  });
  it("exports learner instructions without expected answers or file hashes", () => {
    expect(Object.keys(publicCaseInstructions(fixture().definition)).sort()).toEqual(["checklist", "instructions", "title"]);
  });
  it("strips unexpected private metadata from checklist questions", () => {
    const { definition } = fixture();
    Object.assign(definition.checklist[0], { correctAnswer: "PRIVATE KEY", explanation: "PRIVATE KEY" });
    expect(JSON.stringify(publicCaseInstructions(definition))).not.toContain("PRIVATE KEY");
  });
  it.each(["missing-item", "inflated-marks", "duplicate-check", "unsafe", "native-substitution", "unavailable-choice"])("rejects invalid key: %s", problem => {
    const { definition } = fixture();
    if (problem === "missing-item") definition.checks.pop();
    if (problem === "inflated-marks") definition.checks[0].marks++;
    if (problem === "duplicate-check") definition.checks[1].id = definition.checks[0].id;
    if (problem === "unsafe") definition.checks.forEach(c => c.safetyCritical = false);
    if (problem === "native-substitution") { definition.checks[0].source = "checklist"; definition.checks[0].field = "signed"; }
    if (problem === "unavailable-choice") definition.checks.find(c => c.id === "correct_conclusion")!.expected = "unknown";
    expect(() => parsePracticalCase(definition)).toThrow();
  });
  it.each([NaN, Infinity, -1, 69])("rejects invalid theory score %s", score => {
    const { definition, native, checklist } = fixture(); expect(() => scorePractical(definition, native, checklist, score, true)).toThrow();
  });
});
