export type TaxTreatment = "not_collected" | "inclusive" | "exclusive";
export type PayoutRule = "per_transaction" | "transaction_threshold" | "monthly";
export type RecipientOnboardingStatus = "not_started" | "pending" | "complete" | "restricted" | "disabled";

export type CourseCommerceSetting = {
  courseId: string;
  priceCents: number;
  currency: string;
  taxTreatment: TaxTreatment;
  taxNotice: string;
};

export type CoursePaymentRecipient = {
  id: string;
  courseId: string;
  displayName: string;
  recipientEmail: string | null;
  countryCode: string | null;
  revenueShareBps: number;
  payoutRule: PayoutRule;
  transactionThreshold: number | null;
  stripeConnectedAccountId: string | null;
  onboardingStatus: RecipientOnboardingStatus;
  isActive: boolean;
};

export const DEFAULT_TAX_NOTICE = "Taxes are not collected by APGI for this course. Buyers and recipients remain responsible for their own tax obligations.";

const defaults: Record<string, Pick<CourseCommerceSetting, "priceCents" | "currency">> = {
  "scannex-training-programme": { priceCents: 30000, currency: "USD" },
  "vpshr-level-0": { priceCents: 12000, currency: "USD" },
};

export function defaultCourseCommerceSetting(courseId: string): CourseCommerceSetting {
  const configured = defaults[courseId] ?? { priceCents: 0, currency: "USD" };
  return { courseId, ...configured, taxTreatment: "not_collected", taxNotice: DEFAULT_TAX_NOTICE };
}

export function formatCoursePrice(priceCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "code" }).format(priceCents / 100);
}
