import { SCANNEX_PRACTICAL_RUBRIC } from "./scannex-practical-rubric";

export const AUTOMATED_PRACTICAL_VERSION = "scannex-practical-v2";
export const AUTOMATED_PRACTICAL_MAX = 100;
export const SCANNEX_COURSE_ID = "scannex-training-programme";
export type Fact = string | number | boolean | string[];
export type Facts = Record<string, Fact>;
export type MarkingCheck = {
  id: string;
  criterionId: string;
  marks: number;
  source: "native" | "checklist";
  field: string;
  operation: "equals" | "includes_all" | "at_least" | "at_most";
  expected: Fact;
  safetyCritical?: boolean;
};
export type ChecklistField = { id: string; prompt: string; options: string[] };
export type PracticalCase = {
  title: string;
  instructions: string;
  exerciseReference: string;
  imageHashes: string[];
  adapterVersion: string;
  checklist: ChecklistField[];
  checks: MarkingCheck[];
};
export type PracticalResult = {
  version: typeof AUTOMATED_PRACTICAL_VERSION;
  status: "incomplete" | "passed" | "failed";
  practicalScore: number | null;
  practicalMaximum: 100;
  practicalContribution: number | null;
  theoryScore: number;
  finalScore: number | null;
  safetyFailure: boolean;
  missingEvidence: string[];
  items: { id: string; score: number; maximum: number }[];
  checks: { id: string; awarded: number; satisfied: boolean }[];
};

const idPattern = /^[a-z][a-z0-9_.-]{0,95}$/;
const nativeCriteria = new Set([
  "four_viewing_modes", "invert_mode", "contrast_density", "key_software_features",
  "anomaly_annotation", "systematic_scan", "viewing_modes_for_anomaly",
  "all_anomalies_identified", "annotation_during_interrogation", "checklist_viewing_modes",
  "density_check", "hidden_diamonds_detected"
]);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
export function isFact(value: unknown): value is Fact {
  return typeof value === "boolean" || (typeof value === "string" && value.length <= 4000) ||
    (typeof value === "number" && Number.isFinite(value)) ||
    (Array.isArray(value) && value.length <= 100 && value.every(v => typeof v === "string" && v.length <= 500));
}
export function parseFacts(value: unknown): Facts {
  if (!isRecord(value) || Object.keys(value).length > 500 ||
      Object.entries(value).some(([key, fact]) => !idPattern.test(key) || !isFact(fact))) {
    throw new Error("Invalid evidence fields.");
  }
  return value as Facts;
}

/** Answer keys are server-only records. Never pass the complete case to a client component. */
export function parsePracticalCase(value: unknown): PracticalCase {
  if (!isRecord(value)) throw new Error("A case definition is required.");
  for (const field of ["title", "instructions", "exerciseReference", "adapterVersion"]) {
    if (typeof value[field] !== "string" || !(value[field] as string).trim() || (value[field] as string).length > 12000) {
      throw new Error(`Provide ${field}.`);
    }
  }
  if (!Array.isArray(value.imageHashes) || !value.imageHashes.length || value.imageHashes.length > 30 ||
      value.imageHashes.some(h => typeof h !== "string" || !/^[a-f0-9]{64}$/.test(h)) ||
      new Set(value.imageHashes).size !== value.imageHashes.length) throw new Error("Provide distinct image SHA-256 hashes.");
  if (!Array.isArray(value.checklist) || !value.checklist.length || value.checklist.length > 100) throw new Error("Provide checklist questions.");
  const fieldIds = new Set<string>();
  for (const field of value.checklist) {
    if (!isRecord(field) || typeof field.id !== "string" || !idPattern.test(field.id) || field.id === "signed" || fieldIds.has(field.id) ||
        typeof field.prompt !== "string" || !field.prompt.trim() || field.prompt.length > 2000 ||
        !Array.isArray(field.options) || field.options.length < 2 || field.options.length > 20 ||
        field.options.some(o => typeof o !== "string" || !o.trim() || o.length > 500) || new Set(field.options).size !== field.options.length) {
      throw new Error("Each checklist question needs a unique identifier, a prompt and distinct answer options.");
    }
    fieldIds.add(field.id);
  }
  if (!Array.isArray(value.checks) || !value.checks.length || value.checks.length > 200) throw new Error("Provide marking checks for all 21 rubric items.");
  const checkIds = new Set<string>();
  for (const check of value.checks) {
    if (!isRecord(check) || typeof check.id !== "string" || !idPattern.test(check.id) || checkIds.has(check.id) ||
        !SCANNEX_PRACTICAL_RUBRIC.some(r => r.id === check.criterionId) || !Number.isInteger(check.marks) || Number(check.marks) < 1 ||
        !["native", "checklist"].includes(String(check.source)) || typeof check.field !== "string" || !idPattern.test(check.field) ||
        !["equals", "includes_all", "at_least", "at_most"].includes(String(check.operation)) || !isFact(check.expected) ||
        (check.safetyCritical !== undefined && typeof check.safetyCritical !== "boolean")) throw new Error("Invalid marking check.");
    if (["at_least", "at_most"].includes(String(check.operation)) && typeof check.expected !== "number") throw new Error("Numeric checks need a numeric threshold.");
    if (check.operation === "includes_all" && (!Array.isArray(check.expected) || !check.expected.length)) throw new Error("List checks need expected values.");
    if (check.source === "checklist") {
      const question = value.checklist.find(f => f.id === check.field);
      if (check.field === "signed") {
        if (check.operation !== "equals" || check.expected !== true) throw new Error("Signature checks must require confirmation.");
      } else if (!question || check.operation !== "equals" || !question.options.includes(check.expected)) {
        throw new Error("Checklist checks must match a configured answer option.");
      }
    }
    checkIds.add(check.id);
  }
  const definition = value as PracticalCase;
  for (const item of SCANNEX_PRACTICAL_RUBRIC) {
    const checks = definition.checks.filter(c => c.criterionId === item.id);
    if (checks.reduce((sum, c) => sum + c.marks, 0) !== item.maximumScore) throw new Error(`The checks for ${item.label} must total ${item.maximumScore} marks.`);
    if (nativeCriteria.has(item.id) && !checks.some(c => c.source === "native")) throw new Error(`${item.label} requires native evidence.`);
  }
  if (!definition.checks.some(c => c.criterionId === "correct_actions_recorded" && c.safetyCritical)) throw new Error("Identify the safety-critical operational action check.");
  if (!definition.checks.some(c => c.criterionId === "checklist_signed" && c.source === "checklist" && c.field === "signed")) throw new Error("Require authenticated checklist confirmation.");
  return definition;
}

function matches(actual: Fact, check: MarkingCheck): boolean {
  switch (check.operation) {
    case "equals": return Array.isArray(check.expected)
      ? Array.isArray(actual) && actual.length === check.expected.length && new Set(actual).size === actual.length && actual.every(v => check.expected instanceof Array && check.expected.includes(v))
      : actual === check.expected;
    case "includes_all": return Array.isArray(actual) && Array.isArray(check.expected) && check.expected.every(v => actual.includes(v));
    case "at_least": return typeof actual === "number" && typeof check.expected === "number" && actual >= check.expected;
    case "at_most": return typeof actual === "number" && typeof check.expected === "number" && actual <= check.expected;
  }
}

export function scorePractical(definition: PracticalCase, native: Facts, checklist: Facts, theoryScore: number, captureComplete: boolean): PracticalResult {
  parsePracticalCase(definition);
  parseFacts(native);
  parseFacts(checklist);
  if (!Number.isFinite(theoryScore) || theoryScore < 0 || theoryScore > 68) throw new Error("Invalid theory score.");
  const missingEvidence = definition.checks.filter(c => {
    const facts = c.source === "native" ? native : checklist;
    if (!Object.hasOwn(facts, c.field)) return true;
    const actual = facts[c.field];
    return Array.isArray(c.expected) ? !Array.isArray(actual) : typeof actual !== typeof c.expected;
  }).map(c => `${c.source}:${c.field}`);
  if (!captureComplete) missingEvidence.push("native:capture_complete");
  const base = { version: AUTOMATED_PRACTICAL_VERSION, practicalMaximum: 100, theoryScore } as const;
  if (missingEvidence.length) return { ...base, status: "incomplete", practicalScore: null, practicalContribution: null, finalScore: null, safetyFailure: false, missingEvidence: [...new Set(missingEvidence)], items: [], checks: [] };
  const checks = definition.checks.map(c => {
    const satisfied = matches((c.source === "native" ? native : checklist)[c.field], c);
    return { id: c.id, awarded: satisfied ? c.marks : 0, satisfied };
  });
  const practicalScore = checks.reduce((total, c) => total + c.awarded, 0);
  const practicalContribution = Math.round(practicalScore * 32) / 100;
  const finalScore = Math.round((theoryScore + practicalContribution) * 100) / 100;
  const safetyFailure = definition.checks.some((c, i) => c.safetyCritical && !checks[i].satisfied);
  return { ...base, status: !safetyFailure && theoryScore + practicalContribution >= 75 ? "passed" : "failed", practicalScore, practicalContribution, finalScore, safetyFailure, missingEvidence: [], checks,
    items: SCANNEX_PRACTICAL_RUBRIC.map(item => ({ id: item.id, maximum: item.maximumScore, score: definition.checks.reduce((sum, c, i) => sum + (c.criterionId === item.id ? checks[i].awarded : 0), 0) })) };
}

export function publicCaseInstructions(definition: PracticalCase) {
  return { title: definition.title, instructions: definition.instructions, checklist: definition.checklist };
}
