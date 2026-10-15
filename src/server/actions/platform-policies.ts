"use server";
import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { requireSession, getSupabaseRestUrl } from "@/server/auth/session";
import { adminRest } from "@/server/supabase/admin-rest";
import {
  formText,
  validId,
  emailPattern,
  financialDraftConfiguration,
  policySignatories,
  type StructureState,
} from "@/lib/company-structure";
import {
  requirePolicy,
  requireCompany,
  rows,
  write,
  companyAudit,
} from "@/server/services/company-structure";
import {
  deliverTransactionalEmail,
  emailConfiguration,
} from "@/server/services/email/transactional-delivery";
import { brandedEmail } from "@/server/services/email/send-course-invitation";
import {
  usesStagingMailCapture,
  STAGING_ORIGIN,
} from "@/server/environment-isolation";
async function notifyPolicy(id: string) {
  const pending = await rows<{ recipient_email: string; status: string }>(
    `/rest/v1/policy_email_deliveries?policy_id=eq.${id}&status=in.(pending,failed)&select=recipient_email,status`,
  );
  let failed = 0;
  for (const item of pending) {
    if (usesStagingMailCapture()) {
      await write(
        `/rest/v1/policy_email_deliveries?policy_id=eq.${id}&recipient_email=eq.${encodeURIComponent(item.recipient_email)}`,
        { status: "captured", attempted_at: new Date().toISOString() },
        "PATCH",
      );
      continue;
    }
    const link = new URL(
      `/policies/${id}`,
      emailConfiguration()?.origin ?? STAGING_ORIGIN,
    ).toString();
    const delivered = await deliverTransactionalEmail({
      to: item.recipient_email,
      subject: "A policy is ready for your review",
      html: brandedEmail({
        brand: "APGI Training",
        title: "Your review is requested",
        description:
          "A policy version has been submitted for your review. Sign in using this email to read the exact document and approve or reject it. Approval does not activate financial distributions in this structural release.",
        link,
        button: "Sign in and review",
        footer:
          "No decision is recorded by opening this link. Please submit your decision inside the platform.",
      }),
      text: `A policy is ready for your review. Sign in using this email: ${link}. Opening this link does not approve anything.`,
      idempotencyKey: `policy-${id}-${createHash("sha256").update(item.recipient_email).digest("hex").slice(0, 16)}`,
    });
    if (!delivered.ok) failed++;
    await write(
      `/rest/v1/policy_email_deliveries?policy_id=eq.${id}&recipient_email=eq.${encodeURIComponent(item.recipient_email)}`,
      {
        status: delivered.ok ? "sent" : "failed",
        provider_message_id: delivered.ok ? delivered.providerMessageId : null,
        attempted_at: new Date().toISOString(),
      },
      "PATCH",
    );
  }
  return failed;
}
export async function policyStructureAction(
  _state: StructureState,
  form: FormData,
): Promise<StructureState> {
  const session = await requireSession();
  const op = String(form.get("operation") ?? "");
  try {
    if (op === "create" || op === "revise") {
      await requireAdmin();
      const previous =
        op === "revise"
          ? (await requirePolicy(validId(formText(form, "policy_id", 36, 36))))
              .policy
          : null;
      const title = previous?.title ?? formText(form, "title", 3, 180),
        version = formText(form, "version_label", 1, 60),
        body = formText(form, "body", 10, 40000);
      const org =
        previous?.organisation_id ??
        (formText(form, "organisation_id") || null);
      if (org) await requireCompany(validId(org));
      const reviewers = [
        ...new Set([
          ...policySignatories,
          ...formText(form, "reviewers", 0, 3000)
            .split(/[\n,;]+/)
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean),
        ]),
      ];
      if (reviewers.length > 20 || reviewers.some((s) => !emailPattern.test(s)))
        throw new Error("Enter up to 20 valid reviewer emails.");
      const id = randomUUID();
      let path: string | null = previous?.file_path ?? null,
        fileHash: string | null = previous?.file_sha256 ?? null;
      const file = form.get("pdf");
      if (file instanceof File && file.size) {
        if (file.size > 3 * 1024 * 1024 || file.type !== "application/pdf")
          throw new Error("Upload a PDF no larger than 3 MB.");
        const bytes = Buffer.from(await file.arrayBuffer());
        if (bytes.subarray(0, 5).toString() !== "%PDF-")
          throw new Error("The file is not a valid PDF.");
        path = `policies/${id}/${randomUUID()}.pdf`;
        fileHash = createHash("sha256").update(bytes).digest("hex");
        const uploaded = await fetch(
          getSupabaseRestUrl(
            `/storage/v1/object/apgi-policy-documents/${path}`,
          )!,
          {
            method: "POST",
            headers: {
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
              authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              "content-type": "application/pdf",
            },
            body: new Uint8Array(bytes),
            cache: "no-store",
          },
        );
        if (!uploaded.ok) throw new Error("The PDF could not be stored.");
      }
      const hash = createHash("sha256")
        .update(JSON.stringify({ title, version, body, org, fileHash }))
        .digest("hex");
      await write("/rest/v1/platform_policy_versions", {
        id,
        title,
        version_label: version,
        body,
        organisation_id: org,
        file_path: path,
        file_sha256: fileHash,
        content_hash: hash,
        previous_version_id: previous?.id ?? null,
        created_by: session.user.id,
      });
      await write(
        "/rest/v1/policy_reviewers",
        reviewers.map((email) => ({ policy_id: id, email })),
      );
      await companyAudit(session.user.id, org, id, "policy_draft_created", {
        hash,
      });
      revalidatePath("/admin/policies");
      return {
        success:
          "Policy saved as a draft. No emails were sent and no financial terms were activated.",
      };
    }
    const id = validId(formText(form, "policy_id", 36, 36));
    await requirePolicy(id);
    if (op === "notify") {
      await requireAdmin();
      const failed = await notifyPolicy(id);
      return {
        success: failed
          ? "Some review emails could not be sent. Delivery status is shown below."
          : "Review notifications processed.",
      };
    }
    if (!["submit", "approve", "reject"].includes(op))
      throw new Error("Choose a valid policy action.");
    if (op === "submit") await requireAdmin();
    if (op !== "submit" && form.get("confirm_decision") !== "on")
      throw new Error(
        "Confirm that you reviewed this exact version before recording your decision.",
      );
    const reason = formText(form, "reason", op === "reject" ? 3 : 0, 3000);
    const r = await adminRest("/rest/v1/rpc/v2_policy_review", {
      method: "POST",
      body: JSON.stringify({
        p_policy: id,
        p_actor: session.user.id,
        p_action: op,
        p_reason: reason,
      }),
    });
    if (!r.ok)
      throw new Error(
        "This decision could not be recorded. Check that this version is awaiting your decision and that you are a required reviewer.",
      );
    const state = await r.json();
    const failed = op === "submit" ? await notifyPolicy(id) : 0;
    revalidatePath("/admin/policies");
    revalidatePath(`/policies/${id}`);
    return {
      success: `Policy ${state}.${failed ? " Some notification emails failed; use Retry notifications." : ""} Financial distributions remain inactive.`,
    };
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return {
      error:
        error instanceof Error
          ? error.message
          : "The policy could not be saved.",
    };
  }
}
export async function saveCommercialDraft(
  _state: StructureState,
  form: FormData,
): Promise<StructureState> {
  const { session } = await requireAdmin();
  try {
    const kind = formText(form, "kind");
    if (
      !["course_agreement", "operating_cost", "internal_distribution"].includes(
        kind,
      )
    )
      throw new Error("Choose a valid draft type.");
    const org = formText(form, "organisation_id") || null;
    if (org) await requireCompany(validId(org));
    const course = formText(form, "course_id") || null;
    const id = randomUUID();
    await write("/rest/v1/commercial_agreement_drafts", {
      id,
      organisation_id: org,
      course_id: course,
      title: formText(form, "title", 3, 150),
      kind,
      configuration: financialDraftConfiguration(form),
      created_by: session.user.id,
    });
    await companyAudit(session.user.id, org, id, "commercial_draft_saved");
    revalidatePath("/admin/agreements");
    return {
      success:
        "Saved as a non-operative draft. It cannot charge fees, distribute income or activate rates.",
    };
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return {
      error:
        error instanceof Error
          ? error.message
          : "The draft could not be saved.",
    };
  }
}
