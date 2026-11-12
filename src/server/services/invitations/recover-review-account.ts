import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { adminRest } from "@/server/supabase/admin-rest";
import { canWork, type ReviewRound } from "@/lib/course-review";
import { usesStagingMailCapture } from "@/server/environment-isolation";
import { emailConfiguration, deliverTransactionalEmail } from "@/server/services/email/transactional-delivery";

// Recovery is requested before an account exists. It must preserve the existing
// review assignment and require the recipient to choose and confirm a password.
export async function recoverReviewAccount(email: string): Promise<void> {
  const participants = encodeURIComponent(JSON.stringify([{ email }]));
  const found = await adminRest(`/rest/v1/course_review_rounds?status=eq.open&document->participants=cs.${participants}&select=*&order=created_at.desc&limit=20`);
  if (!found.ok) throw new Error("REVIEW_RECOVERY_LOOKUP_FAILED");
  const rounds = await found.json() as ReviewRound[];
  for (const round of rounds) {
    const person = round.document?.participants?.find(p => p.email === email);
    if (!person || !["invited", "active"].includes(person.state) || !canWork(round)) continue;
    const org = await adminRest(`/rest/v1/organisations?id=eq.${encodeURIComponent(round.organisation_id)}&is_active=eq.true&select=id&limit=1`);
    if (!org.ok) throw new Error("REVIEW_RECOVERY_LOOKUP_FAILED");
    if (!(await org.json()).length) continue;
    if (usesStagingMailCapture()) throw new Error("REVIEW_RECOVERY_EMAIL_DISABLED");
    const config = emailConfiguration();
    if (!config) throw new Error("REVIEW_RECOVERY_EMAIL_UNAVAILABLE");
    const token = randomBytes(32).toString("base64url");
    const saved = await adminRest("/rest/v1/course_review_join_tokens", {
      method: "POST",
      body: JSON.stringify({ token_hash: createHash("sha256").update(token).digest("hex"), round_id: round.id, email, expires_at: round.document.cutoff })
    });
    if (!saved.ok) throw new Error("REVIEW_RECOVERY_TOKEN_FAILED");
    const link = new URL(`/course-reviews/${round.id}/join/${token}`, config.origin).toString();
    const instructions = "Open the link below to choose your own Version 2 password. You do not need to sign in first. Then confirm your email and complete Profile. Return to Course reviews to open your assigned review. Your Version 1 account is unchanged. If this invitation is no longer available, contact the review requester.";
    const result = await deliverTransactionalEmail({
      to: email, subject: "Set up your APGI Training V2 password",
      html: `<p>${instructions}</p><p><a href="${link}">Choose my V2 password and join my course review</a></p><p>If you did not request this email, ignore it.</p>`,
      text: `${instructions}\n\nChoose my V2 password and join my course review: ${link}\n\nIf you did not request this email, ignore it.`,
      idempotencyKey: `review-account-recovery-${randomUUID()}`,
      tracking: { category: "account_recovery", organisationId: round.organisation_id, sourceId: round.id }
    });
    if (!result.ok) throw new Error("REVIEW_RECOVERY_DELIVERY_FAILED");
    return;
  }
}
