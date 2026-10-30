import "server-only";
import {continuingSalesConfiguration,platformJointOwnership,routineMaintenanceTerms} from "@/lib/platform-partnership";
import { formText, validId } from "@/lib/company-structure";
import { costEstimate, courseOwnershipSummary, developmentRecoverySummary, minimumCourseQuote, moneyCents, partnerPlanningDefaults, percentageBps, resolvePlanSharing, sharingBasisLabel, sharingModelLabels, validatePlanOwnership } from "@/lib/commercial-planning";
import { getCourseBySlug,getCourses } from "@/lib/courses";
import { requireCompany, rows } from "./company-structure";
import { calculateServiceCosts, readServiceSelection } from "@/lib/service-costs";
import { currentRateCatalogue } from "./service-rate-register";
import { verifiedServiceExchange } from "./currency-rates";

export function planningCostConfiguration(form: FormData) {
  const configuration: Record<string, string | null> = { planning_version: "1", currency: formText(form, "currency"), administration_rate: formText(form, "administration_rate"), hosting_fixed: formText(form, "hosting_fixed"), hosting_rate: formText(form, "hosting_rate"), stripe_fixed: formText(form, "stripe_fixed"), stripe_rate: formText(form, "stripe_rate"), cost_period: formText(form, "cost_period", 3, 250), notes: formText(form, "notes", 0, 5000) || null };
  if (!/^[A-Z]{3}$/.test(configuration.currency!)) throw new Error("Use a three-letter currency code.");
  costEstimate(configuration);
  return configuration;
}
export async function coursePlanConfiguration(form: FormData) {
  const revisedTerms=formText(form,"commercial_terms_version")==="2";
  const designerName=formText(form,"designer_name",2,180);
  const designerCompany=formText(form,"designer_company",2,180);
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
  if(mode==="services")serviceResult=calculateServiceCosts(await verifiedServiceExchange(readServiceSelection(formText(form,"service_costs",1,24000)),currency),currency,true,await currentRateCatalogue());
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
  const ownershipModel = formText(form, "ownership_model");
  const clientOwnerId = ownershipModel === "apgi_until_recovered" ? validId(formText(form, "client_owner_id")) : ownershipModel === "partner_paid" ? ownerId : null;
  const clientOwner = clientOwnerId ? (clientOwnerId === ownerId ? owner : clientOwnerId === org ? brand : await requireCompany(clientOwnerId)) : null;
  validatePlanOwnership(ownershipModel, owner.company.slug === "apgi", developmentStatus, !!clientOwner && clientOwner.company.slug !== "apgi");
  const partnerRecovery = ownershipModel === "apgi_until_recovered";
  const ownApgi = owner.company.slug === "apgi" && brand.company.slug === "apgi" && !partnerRecovery;
  const sharing = resolvePlanSharing({ model: formText(form, "sharing_model") || (form.get("custom_shares") === "on" ? "tailored" : formText(form, "customer_source")),
    ownerIsApgi: owner.company.slug === "apgi", brandIsApgi: brand.company.slug === "apgi",
    partnerRecovery,
    apgiShare: formText(form, "apgi_share"), partnerShare: form.has("platform_user_share") ? formText(form, "platform_user_share") : undefined,
    reason: formText(form, "tailored_reason", 0, 1000) });
  const shareBps = sharing.apgiShareBps;
  const recovery = developmentStatus === "recover" ? formText(form, "recovery_rate") : "0";
  const recoveryBase = ownApgi ? "cost_cleared_pool" : partnerPlanningDefaults.recoveryBase;
  const estimate = serviceResult?.estimate ?? costEstimate(profile!.configuration);
  const quote = minimumCourseQuote({ ...estimate, minimumApgiCents: moneyCents(formText(form, "minimum_apgi_income"), "minimum APGI income"), apgiShareBps: shareBps, recoveryBps: percentageBps(recovery, "development recovery percentage"), outstandingCents: developmentCost - alreadyPaid, recoveryBase });
  const configuration: Record<string, string | null> = {
    planning_version: "1", agreement_scope: ownApgi ? "apgi_course" : "partner", currency,
    contract_partner_id: clientOwnerId ?? (brand.company.slug !== "apgi" ? brand.company.id : owner.company.slug !== "apgi" ? owner.company.id : null),
    rights_holder: ownerId, rights_holder_name: owner.company.name, brand_name: brand.company.name,
    ownership_model: ownershipModel, client_owner_id: clientOwnerId, client_owner_name: clientOwner?.company.name ?? null,
    designer_name:designerName,designer_company:designerCompany,
    brand_revision: String(brand.company.brand_revision), development_status: developmentStatus,
    development_cost: (developmentCost / 100).toFixed(2), already_paid: (alreadyPaid / 100).toFixed(2),
    development_funder: revisedTerms||ownApgi ? "SRMS" : "APGI platform",
    recovery_rate: recovery, recovery_base: recoveryBase,
    customer_source: sharing.model, sharing_model: sharing.model, tailored_reason: sharing.reason,
    apgi_share: (shareBps / 100).toFixed(2), platform_user_share: ((10000 - shareBps) / 100).toFixed(2),
    minimum_apgi_income: formText(form, "minimum_apgi_income"), cost_profile_id: profile?.id??null,
    cost_mode:mode,service_cost_snapshot:serviceResult?JSON.stringify(serviceResult.snapshot):null,
    administration_rate: (estimate.administrationBps/100).toFixed(2),
    contingency_rate: ((estimate.contingencyBps??0)/100).toFixed(2), estimated_contingency:(quote.contingency/100).toFixed(2),
    hosting_fixed: (estimate.hostingFixedCents/100).toFixed(2), hosting_rate:(estimate.hostingRateBps/100).toFixed(2),
    stripe_fixed: (estimate.stripeFixedCents/100).toFixed(2), stripe_rate:(estimate.stripeRateBps/100).toFixed(2),
    minimum_course_price: (quote.price / 100).toFixed(2), estimated_costs: (quote.costs / 100).toFixed(2),
    estimated_administration: (quote.administration / 100).toFixed(2), estimated_recovery: (quote.recovery / 100).toFixed(2),
    estimated_apgi_income: (quote.apgi / 100).toFixed(2), estimated_partner_income: (quote.partner / 100).toFixed(2),
    calculation_basis: `Costs first; separate operating-cost contingency; administration on eligible costs only, excluding the reserve; ${ownApgi?"capped internal recovery from the cost-cleared pool":"APGI ongoing platform share set aside first; capped development recovery deducted only from the partner share"}. Unused reserve must be reconciled and released through the agreed recovery and sharing rules. Draft estimate, not an approved price or settlement.`,
    notes: formText(form, "notes", 0, 5000) || null,
  };
  configuration.terms_summary = [
    `${brand.company.name}: ${getCourseBySlug(course)!.title}. Current declared owner: ${owner.company.name}. Planning minimum learner price ${currency} ${(quote.price/100).toFixed(2)}; minimum ongoing combined APGI income ${currency} ${(moneyCents(formText(form,"minimum_apgi_income"),"minimum income")/100).toFixed(2)}, excluding development recovery.`,
    `Running costs are provided first, plus ${estimate.administrationBps/100}% administration on eligible costs only. A separate ${((estimate.contingencyBps??0)/100).toFixed(2)}% operating-cost contingency of ${currency} ${(quote.contingency/100).toFixed(2)} is reserved; it is not an incurred expense and attracts no administration fee. Reconcile it against actual costs and release any unused reserve through the agreed recovery and sharing rules.`,
    `The split ${sharingBasisLabel(configuration)} is ${(shareBps/100).toFixed(2)}% APGI and ${((10000-shareBps)/100).toFixed(2)}% partner. ${developmentRecoverySummary(configuration)} Outstanding recovery: ${currency} ${((developmentCost-alreadyPaid)/100).toFixed(2)}.`,
    "No separate fixed hosting or seat subscription. Any proposed higher price must be recalculated against the same cost and income requirements. This working draft does not approve rights, transfer ownership, publish a course or activate payment terms.",
  ].join(" ");
  configuration.terms_summary += ` Course design credit: ${designerName}, ${designerCompany}. Design credit is recorded separately from legal ownership and does not itself transfer rights.`;
  configuration.terms_summary += ` Sharing model: ${ownApgi ? "APGI-owned and APGI-branded course" : sharingModelLabels[sharing.model]}.${sharing.reason ? ` Reason for the tailored model: ${sharing.reason}` : ""}`;
  configuration.terms_summary += ` ${courseOwnershipSummary(configuration)} This draft records the proposed conditions; saving it does not activate or execute an ownership transfer.`;
  if(revisedTerms){
    configuration.commercial_terms_version="2";
    if(owner.company.slug==="apgi"){configuration.platform_ownership_terms=platformJointOwnership;configuration.terms_summary+=`\n${platformJointOwnership}`;}
    if(!ownApgi){
      const sales=continuingSalesConfiguration(form,{courseId:course,clientName:clientOwner?.company.name??brand.company.name,ownershipModel,catalogue:getCourses().map(c=>({slug:c.slug,title:c.title,restricted:c.catalogueVisibility==="client_specific"}))});
      Object.assign(configuration,sales);configuration.terms_summary+=`\n${sales.continuing_sales_terms}${sales.continuing_sales_conditions?`\nAdditional sales conditions: ${sales.continuing_sales_conditions}`:''}`;
    }else configuration.terms_summary+=`\nRoutine maintenance: ${routineMaintenanceTerms}`;
  }
  return configuration;
}
