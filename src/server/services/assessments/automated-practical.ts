import "server-only";
import { AppStreamClient, CreateStreamingURLCommand } from "@aws-sdk/client-appstream";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";
import { adminRest } from "@/server/supabase/admin-rest";
import { parsePracticalCase, scorePractical, type Facts, type PracticalCase, type PracticalResult } from "@/lib/assessments/automated-practical";
import { canonicalJson, sha256, validateNativeEvidence } from "@/server/assessments/scannex-native-evidence";

export type PracticalRequest = {
  id: string; learner_user_id: string; learner_email: string; preferred_date: string;
  status: string; case_id: string | null; opens_at: string | null; closes_at: string | null;
  created_at: string; notification_status: string;
};
export type PracticalCaseRow = { id: string; title: string; status: string; definition: PracticalCase; definition_sha256: string; created_at: string };
export type PracticalAttempt = {
  id: string; request_id: string; case_id: string; case_sha256: string; learner_user_id: string;
  collector_nonce: string; theory_score: number; started_at: string; expires_at: string;
  checklist: Facts | null; checklist_submitted_at: string | null; result: PracticalResult | null; completed_at: string | null;
};
export const PRACTICAL_PATH = "/learn/scannex-training-programme/units/lu9/viewer-lab";
export const AUTOMATION_ADMIN_PATH = "/admin/assessments/automation/manage";

export async function practicalRest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await adminRest(`/rest/v1/${path}`, init);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { message?: string };
    const known = /^(ENROLMENT_REQUIRED|INVALID_DATE|ADMIN_REQUIRED|REQUEST_NOT_PENDING|APPROVED_CASE_REQUIRED|INVALID_WINDOW|REQUEST_CANNOT_BE_CANCELLED|ACCESS_WINDOW_CLOSED|ATTEMPT_SUBMITTED|THEORY_REQUIRED|CHECKLIST_ALREADY_SUBMITTED|ATTEMPT_CLOSED|SIGNATURE_REQUIRED|CONFLICTING_EVIDENCE|EVIDENCE_WINDOW_CLOSED|RESULT_IMMUTABLE|EVIDENCE_REQUIRED|INVALID_RESULT)$/;
    throw new Error(known.test(payload.message ?? "") ? payload.message : "ASSESSMENT_STORAGE_UNAVAILABLE");
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}
export async function practicalRpc<T = void>(name: string, args: Record<string, unknown>): Promise<T> {
  return practicalRest<T>(`rpc/${name}`, { method: "POST", body: JSON.stringify(args) });
}
export function collectorConfigured() {
  return Boolean(process.env.SCANNEX_VERIFIED_ADAPTER_VERSION?.trim() && (process.env.SCANNEX_COLLECTOR_SECRET?.length ?? 0) >= 32);
}
export function livePracticalConfigured() {
  return process.env.SCANNEX_LIVE_ENABLED === "true" && collectorConfigured() &&
    ["SCANNEX_AWS_ROLE_ARN", "SCANNEX_AWS_STACK", "SCANNEX_AWS_FLEET", "SCANNEX_AWS_APPLICATION"].every(key => Boolean(process.env[key]?.trim()));
}
export async function getCase(id: string) {
  const rows = await practicalRest<PracticalCaseRow[]>(`scannex_cases?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
  if (!rows[0]) throw new Error("ASSESSMENT_CASE_UNAVAILABLE");
  rows[0].definition = parsePracticalCase(rows[0].definition);
  if (sha256(canonicalJson(rows[0].definition)) !== rows[0].definition_sha256) throw new Error("ASSESSMENT_CASE_INTEGRITY_FAILED");
  return rows[0];
}
export async function getAttempt(id: string, learnerId?: string) {
  const rows = await practicalRest<PracticalAttempt[]>(`scannex_attempts?id=eq.${encodeURIComponent(id)}${learnerId ? `&learner_user_id=eq.${encodeURIComponent(learnerId)}` : ""}&select=*&limit=1`);
  if (!rows[0]) throw new Error("ASSESSMENT_ATTEMPT_UNAVAILABLE");
  return rows[0];
}
export async function finalisePractical(attemptId: string) {
  const attempt = await getAttempt(attemptId);
  if (attempt.completed_at || !attempt.checklist) return;
  const evidence = await practicalRest<{ payload: unknown }[]>(`scannex_native_evidence?attempt_id=eq.${encodeURIComponent(attemptId)}&select=payload&limit=1`);
  if (!evidence[0]) return;
  const row = await getCase(attempt.case_id);
  const native = validateNativeEvidence(evidence[0].payload, attempt, row.definition);
  if (!collectorConfigured() || native.adapterVersion !== process.env.SCANNEX_VERIFIED_ADAPTER_VERSION) throw new Error("NATIVE_ADAPTER_NOT_VALIDATED");
  const result = scorePractical(row.definition, native.facts, attempt.checklist, Number(attempt.theory_score), native.captureComplete);
  await practicalRpc("scannex_finish_practical", { p_attempt: attemptId, p_result: result });
}
export async function createPracticalStreamingUrl(attempt: PracticalAttempt, definition: PracticalCase) {
  if (!livePracticalConfigured() || definition.adapterVersion !== process.env.SCANNEX_VERIFIED_ADAPTER_VERSION) throw new Error("HOSTING_NOT_READY");
  const client = new AppStreamClient({ region: "eu-west-1", credentials: awsCredentialsProvider({ roleArn: process.env.SCANNEX_AWS_ROLE_ARN! }) });
  const response = await client.send(new CreateStreamingURLCommand({
    StackName: process.env.SCANNEX_AWS_STACK!, FleetName: process.env.SCANNEX_AWS_FLEET!,
    ApplicationId: process.env.SCANNEX_AWS_APPLICATION!, UserId: attempt.id.replaceAll("-", ""), Validity: 60,
    SessionContext: JSON.stringify({ attemptId: attempt.id, caseId: attempt.case_id, caseHash: attempt.case_sha256, nonce: attempt.collector_nonce, expiresAt: attempt.expires_at, exerciseReference: definition.exerciseReference })
  }));
  if (!response.StreamingURL) throw new Error("STREAM_UNAVAILABLE");
  const parsed = new URL(response.StreamingURL);
  if (parsed.protocol !== "https:" || parsed.hostname !== "appstream2.eu-west-1.aws.amazon.com") throw new Error("INVALID_STREAM_URL");
  return response.StreamingURL;
}
