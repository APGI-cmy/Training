import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { parseFacts, type Facts, type PracticalCase } from "../../lib/assessments/automated-practical";

export type NativeEvidence = {
  attemptId: string; caseHash: string; nonce: string; adapterVersion: string;
  imageHashes: string[]; startedAt: string; endedAt: string; captureComplete: boolean;
  facts: Facts;
  artifacts: { kind: "scannex_result" | "movement_log"; sha256: string; base64: string }[];
};
export const MAX_EVIDENCE_BYTES = 1024 * 1024;
export function sha256(text: string | Buffer) { return createHash("sha256").update(text).digest("hex"); }
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
export function verifyCollectorSignature(body: string, timestamp: string | null, signature: string | null, secret: string, now = Date.now()) {
  if (secret.length < 32 || !timestamp || !/^\d{10}$/.test(timestamp) || !signature || !/^[a-f0-9]{64}$/.test(signature)) return false;
  if (Math.abs(now - Number(timestamp) * 1000) > 5 * 60 * 1000) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
export function validateNativeEvidence(value: unknown, attempt: { id: string; case_sha256: string; collector_nonce: string; started_at: string; expires_at: string }, definition: PracticalCase, now = Date.now()): NativeEvidence {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid native evidence.");
  const data = value as NativeEvidence;
  if (data.attemptId !== attempt.id || data.caseHash !== attempt.case_sha256 || data.nonce !== attempt.collector_nonce || data.adapterVersion !== definition.adapterVersion) throw new Error("Evidence does not match the assigned attempt.");
  const start = Date.parse(data.startedAt), end = Date.parse(data.endedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < Date.parse(attempt.started_at) || end < start || end > Date.parse(attempt.expires_at) || end > now + 5000) throw new Error("Invalid evidence capture interval.");
  if (typeof data.captureComplete !== "boolean" || !Array.isArray(data.imageHashes) || data.imageHashes.length !== definition.imageHashes.length || new Set(data.imageHashes).size !== data.imageHashes.length || data.imageHashes.some(hash => !definition.imageHashes.includes(hash))) throw new Error("Evidence images do not match the case.");
  parseFacts(data.facts);
  if (!Array.isArray(data.artifacts) || data.artifacts.length !== 2 || new Set(data.artifacts.map(a => a.kind)).size !== 2) throw new Error("Both native result and movement evidence are required.");
  for (const artifact of data.artifacts) {
    if (!["scannex_result", "movement_log"].includes(artifact.kind) || typeof artifact.base64 !== "string" || artifact.base64.length > MAX_EVIDENCE_BYTES || !/^[a-f0-9]{64}$/.test(artifact.sha256)) throw new Error("Invalid native artifact.");
    const bytes = Buffer.from(artifact.base64, "base64");
    if (!bytes.length || bytes.toString("base64") !== artifact.base64 || sha256(bytes) !== artifact.sha256) throw new Error("Native artifact integrity check failed.");
  }
  return data;
}
