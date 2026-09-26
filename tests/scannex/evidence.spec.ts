import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalJson, validateNativeEvidence, verifyCollectorSignature } from "../../src/server/assessments/scannex-native-evidence";
import { fixture } from "./fixtures";

describe("native evidence provenance", () => {
  const now = Date.parse("2026-09-25T12:31:00Z"), timestamp = String(now / 1000), secret = "synthetic-test-secret-32-bytes-long";
  const body = JSON.stringify(fixture().evidence);
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  it("accepts a fresh signature", () => expect(verifyCollectorSignature(body, timestamp, signature, secret, now)).toBe(true));
  it.each(["body", "signature", "timestamp", "expired", "short-secret"])("rejects invalid authentication: %s", problem => {
    expect(verifyCollectorSignature(problem === "body" ? body + " " : body, problem === "timestamp" ? null : timestamp, problem === "signature" ? "0".repeat(64) : signature, problem === "short-secret" ? "short" : secret, problem === "expired" ? now + 300001 : now)).toBe(false);
  });
  it("validates a capture bound to the attempt and artifacts", () => {
    const { evidence, attempt, definition } = fixture(); expect(validateNativeEvidence(evidence, attempt, definition, now)).toEqual(evidence);
  });
  it.each(["attempt", "case", "nonce", "adapter", "image", "start", "end", "artifact", "missing-artifact", "duplicate-artifact", "facts"])("rejects invalid capture: %s", problem => {
    const { evidence, attempt, definition } = fixture();
    if (problem === "attempt") evidence.attemptId = "another";
    if (problem === "case") evidence.caseHash = "b".repeat(64);
    if (problem === "nonce") evidence.nonce = "another";
    if (problem === "adapter") evidence.adapterVersion = "unvalidated";
    if (problem === "image") evidence.imageHashes = ["b".repeat(64)];
    if (problem === "start") evidence.startedAt = "2026-09-25T11:59:00Z";
    if (problem === "end") evidence.endedAt = "2026-09-25T13:01:00Z";
    if (problem === "artifact") evidence.artifacts[0].base64 = Buffer.from("tampered").toString("base64");
    if (problem === "missing-artifact") evidence.artifacts.pop();
    if (problem === "duplicate-artifact") evidence.artifacts[1] = evidence.artifacts[0];
    if (problem === "facts") evidence.facts.systematic_scan = NaN;
    expect(() => validateNativeEvidence(evidence, attempt, definition, now)).toThrow();
  });
  it("uses a stable key digest regardless of database JSON key order", () => expect(canonicalJson({ b: { d: 2, c: 1 }, a: [2, 1] })).toBe(canonicalJson({ a: [2, 1], b: { c: 1, d: 2 } })));
});
