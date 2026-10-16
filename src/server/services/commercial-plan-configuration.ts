import "server-only";
import { formText, validId } from "@/lib/company-structure";
import { applicableApgiShare, costEstimate, minimumCourseQuote, moneyCents, partnerPlanningDefaults, percentageBps } from "@/lib/commercial-planning";
import { getCourseBySlug } from "@/lib/courses";
import { requireCompany, rows } from "./company-structure";

export function planningCostConfiguration(form: FormData) {
  const configuration: Record<string, string | null> = { planning_version: "1", currency: formText(form, "currency"), administration_rate: formText(form, "administration_rate"), hosting_fixed: formText(form, "hosting_fixed"), hosting_rate: formText(form, "hosting_rate"), stripe_fixed: formText(form, "stripe_fixed"), stripe_rate: formText(form, "stripe_rate"), cost_period: formText(form, "cost_period", 3, 250), notes: formText(form, "notes", 0, 5000) || null };
  if (!/^[A-Z]{3}$/.test(configuration.currency!)) throw new Error("Use a three-letter currency code.");
  costEstimate(configuration);
  return configuration;
}
export async function coursePlanConfiguration(form: FormData) {
  const org = validId(formText(form, "organisation_id"));
  const ownerId = validId(formText(form, "rights_holder"));
  const course = formText(form, "course_id");
  if (!getCourseBySlug(course)) throw new Error("Select a course in the course library.");
  const [brand, owner, profiles] = await Promise.all([
    requireCompany(org), requireCompany(ownerId),
    rows<{id: string; configuration: Record<string, string | null>}>(`/rest/v1/commercial_agreement_drafts?id=eq.${validId(formText(form, "cost_profile_id"))}&kind=eq.operating_cost&status=eq.draft&select=id,configuration&limit=1`),
  ]);
  const profile = profiles[0];
  if (!profile || profile.configuration.planning_version !== "1") throw new Error("Choose a complete planning cost profile.");
  const currency = formText(form, "currency");
  if (profile.configuration.currency !== currency) throw new Error("The course and cost profile must use the same currency.");
  const developmentStatus = formText(form, "development_status");
  if (!["paid", "recover"].includes(developmentStatus)) throw new Error("Declare whether development is paid or recoverable.");
  const developmentCost = moneyCents(formText(form, "development_cost") || "0", "development cost");
  const alreadyPaid = developmentStatus === "paid" ? developmentCost : moneyCents(formText(form, "already_paid") || "0", "development already paid");
  if (alreadyPaid > developmentCost || (developmentStatus === "recover" && alreadyPaid >= developmentCost)) throw new Error("Recoverable development requires a positive outstanding balance.");
  const source = formText(form, "customer_source");
  if (!["owner", "apgi"].includes(source)) throw new Error("Record who provides the customer.");
  const defaultShare = applicableApgiShare(owner.company.slug === "apgi", brand.company.slug === "apgi", source);
  const ownApgi = owner.company.slug === "apgi" && brand.company.slug === "apgi";
  const share = !ownApgi && form.get("custom_shares") === "on" ? formText(form, "apgi_share") : defaultShare;
  if (!share) throw new Error("Record the agreed APGI share for this licensing arrangement.");
  const shareBps = percentageBps(share, "APGI share");
  const recovery = developmentStatus === "recover" ? formText(form, "recovery_rate") : "0";
  const estimate = costEstimate(profile.configuration);
  const quote = minimumCourseQuote({ ...estimate, minimumApgiCents: moneyCents(formText(form, "minimum_apgi_income"), "minimum APGI income"), apgiShareBps: shareBps, recoveryBps: percentageBps(recovery, "development recovery percentage"), outstandingCents: developmentCost - alreadyPaid });
  const configuration: Record<string, string | null> = {
    planning_version: "1", agreement_scope: brand.company.slug === "apgi" ? "apgi_course" : "partner", currency,
    rights_holder: ownerId, rights_holder_name: owner.company.name, brand_name: brand.company.name,
    brand_revision: String(brand.company.brand_revision), development_status: developmentStatus,
    development_cost: (developmentCost / 100).toFixed(2), already_paid: (alreadyPaid / 100).toFixed(2),
    development_funder: brand.company.slug === "apgi" ? "SRMS" : "APGI platform",
    recovery_rate: recovery, recovery_base: partnerPlanningDefaults.recoveryBase,
    customer_source: source, apgi_share: (shareBps / 100).toFixed(2), platform_user_share: ((10000 - shareBps) / 100).toFixed(2),
    minimum_apgi_income: formText(form, "minimum_apgi_income"), cost_profile_id: profile.id,
    administration_rate: profile.configuration.administration_rate,
    hosting_fixed: profile.configuration.hosting_fixed, hosting_rate: profile.configuration.hosting_rate,
    stripe_fixed: profile.configuration.stripe_fixed, stripe_rate: profile.configuration.stripe_rate,
    minimum_course_price: (quote.price / 100).toFixed(2), estimated_costs: (quote.costs / 100).toFixed(2),
    estimated_administration: (quote.administration / 100).toFixed(2), estimated_recovery: (quote.recovery / 100).toFixed(2),
    estimated_apgi_income: (quote.apgi / 100).toFixed(2), estimated_partner_income: (quote.partner / 100).toFixed(2),
    calculation_basis: "Costs first; administration on costs only; capped recovery from cost-cleared pool; then owner/platform split. Draft estimate, not an approved price or settlement.",
    notes: formText(form, "notes", 0, 5000) || null,
  };
  configuration.terms_summary = `${brand.company.name}: ${getCourseBySlug(course)!.title}. Current declared owner: ${owner.company.name}. Planning minimum learner price ${currency} ${(quote.price/100).toFixed(2)}; minimum combined APGI income ${currency} ${(moneyCents(formText(form,"minimum_apgi_income"),"minimum income")/100).toFixed(2)}. Running costs are provided first, plus ${profile.configuration.administration_rate}% administration on eligible costs only. Development recovery is ${recovery}% of the cost-cleared pool before sharing, capped at ${currency} ${((developmentCost-alreadyPaid)/100).toFixed(2)} outstanding. The remaining pool is shared ${(shareBps/100).toFixed(2)}% APGI and ${((10000-shareBps)/100).toFixed(2)}% partner. No separate fixed hosting or seat subscription. Any proposed higher price must be recalculated against the same cost and income requirements. This working draft does not approve rights, transfer ownership, publish a course or activate payment terms.`;
  return configuration;
}
