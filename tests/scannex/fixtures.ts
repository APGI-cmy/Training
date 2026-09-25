import { SCANNEX_PRACTICAL_RUBRIC } from "../../src/lib/assessments/scannex-practical-rubric";
import type { Facts, PracticalCase } from "../../src/lib/assessments/automated-practical";
import { canonicalJson, sha256 } from "../../src/server/assessments/scannex-native-evidence";

// Entirely synthetic. These observations are not a Scannex export or an approved assessment key.
export function fixture() {
  const definition: PracticalCase = {
    title: "SYNTHETIC TEST ONLY", instructions: "Synthetic test instructions", exerciseReference: "SYNTHETIC-ONLY",
    imageHashes: ["a".repeat(64)], adapterVersion: "synthetic-test-v1",
    checklist: [{ id: "conclusion", prompt: "Synthetic conclusion?", options: ["refer", "clear"] }],
    checks: SCANNEX_PRACTICAL_RUBRIC.map(item => ({ id: item.id, criterionId: item.id, marks: item.maximumScore,
      source: item.id === "checklist_signed" || item.id === "correct_conclusion" ? "checklist" : "native",
      field: item.id === "checklist_signed" ? "signed" : item.id === "correct_conclusion" ? "conclusion" : item.id,
      operation: "equals", expected: item.id === "correct_conclusion" ? "refer" : true,
      ...(item.id === "correct_actions_recorded" ? { safetyCritical: true } : {}) }))
  };
  const native: Facts = Object.fromEntries(definition.checks.filter(c => c.source === "native").map(c => [c.field, c.expected]));
  const checklist: Facts = { signed: true, conclusion: "refer" };
  const attempt = { id: "10000000-0000-4000-8000-000000000001", case_sha256: sha256(canonicalJson(definition)), collector_nonce: "nonce", started_at: "2026-09-25T12:00:00Z", expires_at: "2026-09-25T13:00:00Z" };
  const artifact = Buffer.from("SYNTHETIC-NATIVE-EXPORT");
  const evidence = { attemptId: attempt.id, caseHash: attempt.case_sha256, nonce: attempt.collector_nonce, adapterVersion: definition.adapterVersion,
    imageHashes: definition.imageHashes, startedAt: "2026-09-25T12:01:00Z", endedAt: "2026-09-25T12:30:00Z", captureComplete: true, facts: native,
    artifacts: (["scannex_result", "movement_log"] as const).map(kind => ({ kind, sha256: sha256(artifact), base64: artifact.toString("base64") })) };
  return { definition, native, checklist, attempt, evidence };
}
