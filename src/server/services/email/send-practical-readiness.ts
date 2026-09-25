import "server-only";
import type { PracticalRequest } from "@/server/services/assessments/automated-practical";

export async function sendPracticalReadiness(request: PracticalRequest): Promise<{ accepted: boolean; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim(), from = process.env.EMAIL_FROM?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!apiKey || !from || !appUrl || /[\r\n]/.test(from)) return { accepted: false };
  let link: URL;
  try { link = new URL("/admin/assessments/automation/manage", appUrl); } catch { return { accepted: false }; }
  if (link.protocol !== "https:" && process.env.NODE_ENV === "production") return { accepted: false };
  // Retry the same immutable message within the provider's 24-hour deduplication window only.
  if (Date.now() - Date.parse(request.created_at) > 23 * 60 * 60 * 1000) return { accepted: false };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(10000),
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "idempotency-key": `scannex-readiness-${request.id}` },
      body: JSON.stringify({ from, to: ["johan.ras@apginc.ca"], subject: "Scannex practical assessment readiness request",
        text: `A learner is ready for the Scannex practical assessment.\n\nLearner: ${request.learner_email}\nPreferred date: ${request.preferred_date}\nRequest: ${request.id}\n\nReview the request and approve an access window: ${link.toString()}\n\nThis request does not grant assessment access.` })
    });
    if (!response.ok) return { accepted: false };
    const payload = await response.json() as { id?: string };
    return { accepted: true, id: payload.id };
  } catch { return { accepted: false }; }
}
