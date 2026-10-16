import "server-only";
import { formText, validId } from "@/lib/company-structure";
import { applicableApgiShare, costEstimate, minimumCourseQuote, moneyCents, partnerPlanningDefaults, percentageBps } from "@/lib/commercial-planning";
import { getCourseBySlug } from "@/lib/courses";
import { requireCompany, rows } from "./company-structure";
import { calculateServiceCosts, readServiceSelection } from "@/lib/service-costs";
import { currentRateCatalogue } from "./service-rate-register";

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
  const [brand, owner] = await Promise.all([requireCompany(org), requireCompany(ownerId)]);
  const currency = formText(form, "currency");
  const mode=formText(form,"cost_mode")||"saved";
  if(!["saved","services"].includes(mode))throw Error("Choose a valid cost preparation method.");
  let profile:{id:string;configuration:Record<string,string|null>}|undefined;
  let serviceResult:ReturnType<typeof calculateServiceCosts>|undefined;
  if(mode==="services")serviceResult=calculateServiceCosts(readServiceSelection(formText(form,"service_costs",1,24000)),currency,true,await currentRateCatalogue());
  else {
    profile=(await rows<{id:string;configuration:Record<string,string|null>}>(`/rest/v1/commercial_agreement_drafts?id=eq.${validId(formText(form,"cost_profile_id"))}&kind=eq.operating_cost&status=eq.draft&organisation_id=is.null&select=id,configuration&limit=1`))[0];
    if(!profile||profile.configuration.planning_version!=="1")throw Error("Choose a complete planning cost profile.");
    if(profile.configuration.currency!==currency)throw Error("The course and cost profile must use the same currency.");
  }
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
  const estimate = serviceResult?.estimate ?? costEstimate(profile!.configuration);
  const quote = minimumCourseQuote({ ...estimate, minimumApgiCents: moneyCents(formText(form, "minimum_apgi_income"), "minimum APGI income"), apgiShareBps: shareBps, recoveryBps: percentageBps(recovery, "development recovery percentage"), outstandingCents: developmentCost - alreadyPaid });
  const configuration: Record<string, string | null> = {
    planning_version: "1", agreement_scope: ownApgi ? "apgi_course" : "partner", currency,
    contract_partner_id: brand.company.slug !== "apgi" ? brand.company.id : owner.company.slug !== "apgi" ? owner.company.id : null,
    rights_holder: ownerId, rights_holder_name: owner.company.name, brand_name: brand.company.name,
    brand_revision: String(brand.company.brand_revision), development_status: developmentStatus,
    development_cost: (developmentCost / 100).toFixed(2), already_paid: (alreadyPaid / 100).toFixed(2),
    development_funder: ownApgi ? "SRMS" : "APGI platform",
    recovery_rate: recovery, recovery_base: partnerPlanningDefaults.recoveryBase,
    customer_source: source, apgi_share: (shareBps / 100).toFixed(2), platform_user_share: ((10000 - shareBps) / 100).toFixed(2),
    minimum_apgi_income: formText(form, "minimum_apgi_income"), cost_profile_id: profile?.id??null,
    cost_mode:mode,service_cost_snapshot:serviceResult?JSON.stringify(serviceResult.snapshot):null,
    administration_rate: (estimate.administrationBps/100).toFixed(2),
    hosting_fixed: (estimate.hostingFixedCents/100).toFixed(2), hosting_rate:(estimate.hostingRateBps/100).toFixed(2),
    stripe_fixed: (estimate.stripeFixedCents/100).toFixed(2), stripe_rate:(estimate.stripeRateBps/100).toFixed(2),
    minimum_course_price: (quote.price / 100).toFixed(2), estimated_costs: (quote.costs / 100).toFixed(2),
    estimated_administration: (quote.administration / 100).toFixed(2), estimated_recovery: (quote.recovery / 100).toFixed(2),
    estimated_apgi_income: (quote.apgi / 100).toFixed(2), estimated_partner_income: (quote.partner / 100).toFixed(2),
    calculation_basis: "Costs first; administration on costs only; capped recovery from cost-cleared pool; then owner/platform split. Draft estimate, not an approved price or settlement.",
    notes: formText(form, "notes", 0, 5000) || null,
  };
  configuration.terms_summary = `${brand.company.name}: ${getCourseBySlug(course)!.title}. Current declared owner: ${owner.company.name}. Planning minimum learner price ${currency} ${(quote.price/100).toFixed(2)}; minimum combined APGI income ${currency} ${(moneyCents(formText(form,"minimum_apgi_income"),"minimum income")/100).toFixed(2)}. Running costs are provided first, plus ${estimate.administrationBps/100}% administration on eligible costs only. Development recovery is ${recovery}% of the cost-cleared pool before sharing, capped at ${currency} ${((developmentCost-alreadyPaid)/100).toFixed(2)} outstanding. The remaining pool is shared ${(shareBps/100).toFixed(2)}% APGI and ${((10000-shareBps)/100).toFixed(2)}% partner. No separate fixed hosting or seat subscription. Any proposed higher price must be recalculated against the same cost and income requirements. This working draft does not approve rights, transfer ownership, publish a course or activate payment terms.`;
  return configuration;
}
