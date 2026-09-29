"use server";

import { revalidatePath } from "next/cache";
import { getCourseBySlug } from "@/lib/courses";
import type { PayoutRule, TaxTreatment } from "@/lib/commerce";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminRest } from "@/server/supabase/admin-rest";

export type CommerceFormState = { error?: string; success?: string };
const currencies = new Set(["USD", "CAD", "EUR", "GBP", "ZAR"]);
const taxTreatments = new Set<TaxTreatment>(["not_collected", "inclusive", "exclusive"]);
const payoutRules = new Set<PayoutRule>(["per_transaction", "transaction_threshold", "monthly"]);

function value(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function revalidateCommerce(courseId: string) {
  revalidatePath("/admin/payments");
  revalidatePath("/catalogue");
  revalidatePath(`/courses/${courseId}`);
}

export async function saveCourseCommerceSettings(_previous: CommerceFormState, formData: FormData): Promise<CommerceFormState> {
  const { session } = await requireAdmin();
  const courseId = value(formData, "course_id");
  if (!getCourseBySlug(courseId)) return { error: "Choose a valid course." };
  const priceCents = Math.round(Number(value(formData, "price")) * 100);
  const currency = value(formData, "currency").toUpperCase();
  const taxTreatment = value(formData, "tax_treatment") as TaxTreatment;
  const taxNotice = value(formData, "tax_notice");
  if (!Number.isSafeInteger(priceCents) || priceCents < 0) return { error: "Enter a valid non-negative course price." };
  if (!currencies.has(currency)) return { error: "Choose a supported course currency." };
  if (!taxTreatments.has(taxTreatment)) return { error: "Choose a valid tax treatment." };
  if (taxNotice.length < 10 || taxNotice.length > 500) return { error: "Enter a tax notice between 10 and 500 characters." };

  const response = await adminRest("/rest/v1/course_commerce_settings?on_conflict=course_id", {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ course_id: courseId, price_cents: priceCents, currency, tax_treatment: taxTreatment, tax_notice: taxNotice, updated_by: session.user.id, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) return { error: "Pricing could not be saved. Confirm that the payment-foundation database migration is live." };
  revalidateCommerce(courseId);
  return { success: "Course price and tax treatment saved." };
}

export async function saveCoursePaymentRecipient(_previous: CommerceFormState, formData: FormData): Promise<CommerceFormState> {
  await requireAdmin();
  const courseId = value(formData, "course_id");
  const recipientId = value(formData, "recipient_id");
  const displayName = value(formData, "display_name");
  const recipientEmail = value(formData, "recipient_email").toLowerCase() || null;
  const countryCode = value(formData, "country_code").toUpperCase() || null;
  const shareBps = Math.round(Number(value(formData, "revenue_share_percent")) * 100);
  const payoutRule = value(formData, "payout_rule") as PayoutRule;
  const thresholdText = value(formData, "transaction_threshold");
  const transactionThreshold = payoutRule === "transaction_threshold" ? Number(thresholdText) : null;
  const validTransactionThreshold = typeof transactionThreshold === "number" && Number.isInteger(transactionThreshold) && transactionThreshold >= 2 && transactionThreshold <= 250;
  if (!getCourseBySlug(courseId)) return { error: "Choose a valid course." };
  if (displayName.length < 2 || displayName.length > 120) return { error: "Enter a recipient name between 2 and 120 characters." };
  if (recipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) return { error: "Enter a valid recipient email or leave it blank until onboarding." };
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) return { error: "Use a two-letter recipient country code, such as CA or ZA." };
  if (!Number.isSafeInteger(shareBps) || shareBps < 0 || shareBps > 10000) return { error: "Recipient allocation must be from 0 to 100 percent." };
  if (!payoutRules.has(payoutRule)) return { error: "Choose a valid payout rule." };
  if (payoutRule === "transaction_threshold" && !validTransactionThreshold) return { error: "Choose a transaction threshold from 2 to 250." };

  const body = { course_id: courseId, display_name: displayName, recipient_email: recipientEmail, country_code: countryCode, revenue_share_bps: shareBps, payout_rule: payoutRule, transaction_threshold: transactionThreshold, is_active: true, updated_at: new Date().toISOString() };
  const response = await adminRest(recipientId ? `/rest/v1/course_payment_recipients?id=eq.${encodeURIComponent(recipientId)}` : "/rest/v1/course_payment_recipients", {
    method: recipientId ? "PATCH" : "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(body),
  });
  if (!response.ok) return { error: "Recipient could not be saved. Allocations must not exceed 100 percent for the course." };
  revalidateCommerce(courseId);
  return { success: recipientId ? "Payment recipient updated." : "Payment recipient added." };
}

export async function deactivateCoursePaymentRecipient(input: { courseId: string; recipientId: string }): Promise<CommerceFormState> {
  await requireAdmin();
  if (!getCourseBySlug(input.courseId)) return { error: "Choose a valid course." };
  const response = await adminRest(`/rest/v1/course_payment_recipients?id=eq.${encodeURIComponent(input.recipientId)}&course_id=eq.${encodeURIComponent(input.courseId)}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ is_active: false, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) return { error: "Recipient could not be removed." };
  revalidateCommerce(input.courseId);
  return { success: "Recipient removed from future allocations." };
}
