import "server-only";
import { defaultCourseCommerceSetting, type CourseCommerceSetting, type CoursePaymentRecipient, type RecipientOnboardingStatus, type PayoutRule, type TaxTreatment } from "@/lib/commerce";
import { adminRest } from "@/server/supabase/admin-rest";

type CommerceRow = {
  course_id: string; price_cents: number; currency: string; tax_treatment: TaxTreatment; tax_notice: string;
};
type RecipientRow = {
  id: string; course_id: string; display_name: string; recipient_email: string | null; country_code: string | null;
  revenue_share_bps: number; payout_rule: PayoutRule; transaction_threshold: number | null; stripe_connected_account_id: string | null;
  onboarding_status: RecipientOnboardingStatus; is_active: boolean;
};

function setting(row: CommerceRow): CourseCommerceSetting {
  return { courseId: row.course_id, priceCents: row.price_cents, currency: row.currency, taxTreatment: row.tax_treatment, taxNotice: row.tax_notice };
}

function recipient(row: RecipientRow): CoursePaymentRecipient {
  return {
    id: row.id, courseId: row.course_id, displayName: row.display_name, recipientEmail: row.recipient_email, countryCode: row.country_code,
    revenueShareBps: row.revenue_share_bps, payoutRule: row.payout_rule, transactionThreshold: row.transaction_threshold,
    stripeConnectedAccountId: row.stripe_connected_account_id, onboardingStatus: row.onboarding_status, isActive: row.is_active,
  };
}

export async function getCourseCommerceSettings(courseIds: string[]) {
  const fallback = new Map(courseIds.map((courseId) => [courseId, defaultCourseCommerceSetting(courseId)]));
  try {
    const response = await adminRest(`/rest/v1/course_commerce_settings?select=course_id,price_cents,currency,tax_treatment,tax_notice&course_id=in.(${courseIds.map(encodeURIComponent).join(",")})`);
    if (!response.ok) return fallback;
    for (const row of (await response.json()) as CommerceRow[]) fallback.set(row.course_id, setting(row));
  } catch { /* The site continues to show the configured defaults until the migration is applied. */ }
  return fallback;
}

export async function getCoursePaymentRecipients(courseId: string) {
  try {
    const response = await adminRest(`/rest/v1/course_payment_recipients?select=id,course_id,display_name,recipient_email,country_code,revenue_share_bps,payout_rule,transaction_threshold,stripe_connected_account_id,onboarding_status,is_active&course_id=eq.${encodeURIComponent(courseId)}&order=created_at.asc`);
    return response.ok ? ((await response.json()) as RecipientRow[]).map(recipient) : [];
  } catch { return []; }
}
