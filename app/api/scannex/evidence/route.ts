import { NextResponse } from "next/server";
import { collectorConfigured, finalisePractical, getAttempt, getCase, practicalRpc } from "@/server/services/assessments/automated-practical";
import { MAX_EVIDENCE_BYTES, sha256, validateNativeEvidence, verifyCollectorSignature } from "@/server/assessments/scannex-native-evidence";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const reply = (status: number, message: string) => NextResponse.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
  if (!collectorConfigured()) return reply(503, "Native evidence collection is not enabled.");
  const reader = request.body?.getReader();
  if (!reader) return reply(400, "Evidence is required.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_EVIDENCE_BYTES) { await reader.cancel(); return reply(413, "Evidence exceeds the intake limit."); }
      chunks.push(chunk.value);
    }
    const body = Buffer.concat(chunks).toString("utf8");
    if (!verifyCollectorSignature(body, request.headers.get("x-scannex-timestamp"), request.headers.get("x-scannex-signature"), process.env.SCANNEX_COLLECTOR_SECRET!)) return reply(401, "Invalid collector authentication.");
    const payload = JSON.parse(body) as { attemptId?: unknown };
    if (typeof payload.attemptId !== "string" || !/^[0-9a-f-]{36}$/i.test(payload.attemptId)) return reply(400, "Invalid attempt.");
    const attempt = await getAttempt(payload.attemptId);
    const row = await getCase(attempt.case_id);
    const evidence = validateNativeEvidence(payload, attempt, row.definition);
    if (evidence.adapterVersion !== process.env.SCANNEX_VERIFIED_ADAPTER_VERSION) return reply(422, "The native adapter has not been validated.");
    await practicalRpc("scannex_receive_evidence", { p_attempt: attempt.id, p_hash: sha256(body), p_payload: evidence });
    await finalisePractical(attempt.id);
    return reply(200, "Evidence accepted.");
  } catch { return reply(422, "Evidence could not be accepted. Preserve the original capture for retry."); }
}
