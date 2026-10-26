// Draft planning only. This module creates no charge, entitlement or payout.
export const partnerPlanningDefaults = {
  currency: "USD", administrationRate: "6", recoveryRate: "25",
  recoveryBase: "partner_share", ownerSourcedApgiShare: "20", apgiSourcedApgiShare: "40",
} as const;
export function moneyCents(value: string, label: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error(`Enter ${label} as a non-negative amount with up to two decimal places.`);
  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > 1e12) throw new Error(`${label} is too large.`);
  return cents;
}
export function percentageBps(value: string, label: string) {
  const bps = moneyCents(value, label);
  if (bps > 10000) throw new Error(`${label} must be between 0 and 100%.`);
  return bps;
}
const rate = (cents: number, bps: number, roundUp = false) => Number((BigInt(cents) * BigInt(bps) + (roundUp ? BigInt(9999) : BigInt(0))) / BigInt(10000));
export type CostEstimate = { hostingFixedCents: number; hostingRateBps: number; stripeFixedCents: number; stripeRateBps: number; administrationBps: number; contingencyBps?:number };
export type RecoveryBase = "partner_share" | "cost_cleared_pool";
export type PlanningInput = CostEstimate & { minimumApgiCents: number; apgiShareBps: number; recoveryBps: number; outstandingCents: number; recoveryBase?: RecoveryBase };
export function allocationAtPrice(price: number, input: PlanningInput) {
  if (input.recoveryBase !== undefined && !["partner_share", "cost_cleared_pool"].includes(input.recoveryBase)) throw Error("Invalid recovery base.");
  const costs = input.hostingFixedCents + input.stripeFixedCents + rate(price, input.hostingRateBps, true) + rate(price, input.stripeRateBps, true);
  const administration = rate(costs, input.administrationBps, true);
  const contingency = rate(costs, input.contingencyBps??0, true);
  const available = Math.max(0, price - costs - administration - contingency);
  if (input.recoveryBase === "partner_share") {
    const apgi = rate(available, input.apgiShareBps);
    const partnerGross = available - apgi;
    const recovery = Math.min(input.outstandingCents, rate(partnerGross, input.recoveryBps));
    return { price, costs, administration, contingency, available, recovery, apgi, partner: partnerGross - recovery, shortfall: Math.max(0, costs + administration + contingency - price) };
  }
  const recovery = Math.min(input.outstandingCents, rate(available, input.recoveryBps));
  const distributable = available - recovery;
  const apgi = rate(distributable, input.apgiShareBps);
  return { price, costs, administration, contingency, available, recovery, apgi, partner: distributable - apgi, shortfall: Math.max(0, costs + administration + contingency - price) };
}
export function minimumCourseQuote(input: PlanningInput) {
  for (const [key, value] of Object.entries(input)) if (key !== "recoveryBase" && (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 1e12)) throw new Error(`Invalid ${key}.`);
  if (input.recoveryBase !== undefined && !["partner_share", "cost_cleared_pool"].includes(input.recoveryBase)) throw Error("Invalid recovery base.");
  if (!input.minimumApgiCents || input.minimumApgiCents > 1e12 || input.outstandingCents > 1e12 || input.apgiShareBps <= 0 || input.apgiShareBps > 10000 || input.recoveryBps > 10000 || input.administrationBps > 10000 || (input.contingencyBps??0)>10000)
    throw new Error("Check the minimum income, shares and recovery settings.");
  const costFactor=10000+input.administrationBps+(input.contingencyBps??0);
  if ((input.hostingRateBps + input.stripeRateBps) * costFactor >= 100000000)
    throw new Error("Percentage costs and administration leave no revenue for this course.");
  // Recoveries and owner shares are monotone in the available pool. Individual
  // rounded provider charges are not necessarily monotone in the gross fee.
  const retained = (pool: number) => input.recoveryBase === "partner_share" ? rate(pool, input.apgiShareBps) : rate(pool - Math.min(input.outstandingCents, rate(pool, input.recoveryBps)), input.apgiShareBps);
  let low = 0, high = 1e12;
  if (retained(high) < input.minimumApgiCents) throw new Error("No price within the supported range covers this minimum.");
  while (low < high) { const mid = Math.floor((low + high) / 2); if (retained(mid) >= input.minimumApgiCents) high = mid; else low = mid + 1; }
  const scale = BigInt(10000), denominator = scale * scale - BigInt(input.hostingRateBps + input.stripeRateBps) * BigInt(costFactor);
  const numerator = BigInt(low) * scale * scale + BigInt(input.hostingFixedCents + input.stripeFixedCents) * scale * BigInt(costFactor);
  const firstPossible = Number((numerator + denominator - BigInt(1)) / denominator);
  // At most two processing round-ups plus administration and contingency round-ups separate
  // the exact lower bound from a reconciled cent-valued quote.
  const roundingWindow = Number((BigInt(2 * costFactor + 20000) * scale + denominator - BigInt(1)) / denominator) + 2;
  if (roundingWindow > 10000) throw new Error("This cost profile leaves too little margin for an automatic quote. Review the estimate.");
  for (let price = firstPossible; price <= firstPossible + roundingWindow && price <= 1e12; price++) {
    const quote = allocationAtPrice(price,input); if (quote.apgi >= input.minimumApgiCents) return quote;
  }
  throw new Error("No price within the supported range covers this minimum.");
}
export function costEstimate(configuration: Record<string, string | null>): CostEstimate {
  const required = (key: string) => { const v = configuration[key]; if (v === null || v === undefined || v === "") throw new Error("Select a complete cost estimate. Unknown costs are not assumed to be zero."); return v; };
  return { hostingFixedCents: moneyCents(required("hosting_fixed"), "hosting allocation per learner"), hostingRateBps: percentageBps(required("hosting_rate"), "hosting percentage"), stripeFixedCents: moneyCents(required("stripe_fixed"), "Stripe fixed fee"), stripeRateBps: percentageBps(required("stripe_rate"), "Stripe percentage"), administrationBps: percentageBps(required("administration_rate"), "cost administration percentage"),contingencyBps:percentageBps(configuration.contingency_rate??"0","cost contingency percentage") };
}
export function applicableApgiShare(ownerIsApgi: boolean, brandIsApgi: boolean, source: string, partnerRecovery = false) {
  if (ownerIsApgi && brandIsApgi && !partnerRecovery) return "100";
  if (ownerIsApgi && !partnerRecovery) return null; // Ordinary licensing still needs an agreed schedule.
  return source === "owner" ? partnerPlanningDefaults.ownerSourcedApgiShare : source === "apgi" ? partnerPlanningDefaults.apgiSourcedApgiShare : null;
}

export type SharingModel = "owner" | "apgi" | "tailored";
export type OwnershipModel = "apgi_permanent" | "apgi_until_recovered" | "partner_paid";
export const ownershipModelLabels: Record<OwnershipModel, string> = {
  apgi_permanent: "APGI owns the course indefinitely",
  apgi_until_recovered: "APGI owns the course until fully paid through recovery",
  partner_paid: "Client paid in advance and owns the course from the outset",
};

export function validatePlanOwnership(model: string, ownerIsApgi: boolean, developmentStatus: string, hasPartner: boolean) {
  if (!Object.hasOwn(ownershipModelLabels, model)) throw Error("Choose the course ownership / sale conditions in Step 1 — Course and brand.");
  if (model === "partner_paid") {
    if (ownerIsApgi) throw Error("For a course paid for in advance, record the client as the current legal course owner.");
    if (developmentStatus !== "paid") throw Error("A client-owned course paid for in advance must have development marked already paid.");
  } else if (!ownerIsApgi) throw Error("The selected ownership conditions require APGI to be the current legal course owner.");
  if (model === "apgi_until_recovered") {
    if (!hasPartner) throw Error("Name the client who will own the course after full recovery.");
    if (developmentStatus !== "recover") throw Error("Ownership after recovery requires an outstanding development balance and the recovery payment status.");
  }
  return model as OwnershipModel;
}

export function courseOwnershipSummary(configuration: Record<string, string | null | undefined>) {
  const client = configuration.client_owner_name ?? "the named client";
  if (configuration.ownership_model === "apgi_permanent") return "APGI owns the course indefinitely. Hosting, branding and income sharing do not transfer course ownership.";
  if (configuration.ownership_model === "partner_paid") return `${client} paid the development price in advance and owns the course from the outset. No development recovery is deducted.`;
  if (configuration.ownership_model === "apgi_until_recovered") return `APGI owns the course until the full approved development price of ${configuration.currency} ${configuration.development_cost} has been recovered. ${configuration.currency} ${configuration.already_paid ?? "0.00"} has already been paid or recovered. The ${configuration.recovery_rate}% recovery deduction comes from the client's share, separately from APGI's ongoing platform share, and stops at the remaining balance. Once the full price is recovered, ownership passes to ${client}. APGI's platform share continues after recovery ends.`;
  return "";
}
export const sharingModelLabels: Record<SharingModel, string> = {
  owner: "Course owner / partner — standard model",
  apgi: "APGI — standard model",
  tailored: "Tailored model",
};

export function commercialConditionsSummary(configuration: Record<string, string | null | undefined>) {
  const model=configuration.sharing_model;
  const sharing=model&&Object.hasOwn(sharingModelLabels,model)?`Sharing model: ${sharingModelLabels[model as SharingModel]}.${model==="tailored"&&configuration.tailored_reason?` Reason: ${configuration.tailored_reason}`:""}`:"";
  return [courseOwnershipSummary(configuration),sharing].filter(Boolean).join("\n");
}

export const sharingBasisLabel = (configuration: Record<string, string | null | undefined>) => configuration.recovery_base === "partner_share" ? "after operating costs, before development recovery" : "after costs and development recovery";
export function developmentRecoverySummary(configuration: Record<string, string | null | undefined>) {
  if (configuration.development_status !== "recover") return "Development is already paid; no recovery deduction applies.";
  return configuration.recovery_base === "partner_share"
    ? `Development recovery is ${configuration.recovery_rate}% of the partner's share after APGI's ongoing platform share has been set aside. It is capped at the outstanding development balance and stops when fully recovered. APGI's ongoing share is unchanged.`
    : `Development recovery is ${configuration.recovery_rate}% of the cost-cleared pool before sharing, capped at the outstanding development balance (earlier calculation basis).`;
}

// Earlier drafts stored the percentages, but not the choice that produced them.
// Restore a standard split as standard, rather than treating every partner as custom.
export function restoreSharingModel(saved: Record<string, string | null | undefined>): SharingModel {
  if (saved.sharing_model === "owner" || saved.sharing_model === "apgi" || saved.sharing_model === "tailored") return saved.sharing_model;
  const source = saved.customer_source === "apgi" ? "apgi" : "owner";
  if (saved.customer_source === "tailored" || saved.tailored_reason || (saved.custom_shares === "on" && saved.apgi_share?.trim())) return "tailored";
  const standard = applicableApgiShare(false, false, source);
  if (saved.apgi_share?.trim() && Number(saved.apgi_share) !== Number(standard)) return "tailored";
  return source;
}

export function resolvePlanSharing(input: {
  model: string; ownerIsApgi: boolean; brandIsApgi: boolean;
  apgiShare?: string; partnerShare?: string; reason?: string; partnerRecovery?: boolean;
}) {
  if (!["owner", "apgi", "tailored"].includes(input.model)) throw Error("Choose a customer source / sharing model.");
  if (input.ownerIsApgi && input.brandIsApgi && !input.partnerRecovery) return { model: "apgi" as SharingModel, apgiShareBps: 10000, reason: null };
  const model = input.model as SharingModel;
  if (model !== "tailored") {
    const share = applicableApgiShare(input.ownerIsApgi, input.brandIsApgi, model, input.partnerRecovery);
    if (!share) throw Error("This course is owned by APGI and published under a partner brand. Select Tailored model and record the licensing percentages and reason.");
    return { model, apgiShareBps: percentageBps(share, "APGI share"), reason: null };
  }
  if (!input.apgiShare?.trim()) throw Error("Enter the APGI share for the tailored model. The partner receives the remainder.");
  const apgiShareBps = percentageBps(input.apgiShare.trim(), "APGI share");
  if (!apgiShareBps) throw Error("The APGI share must be greater than 0% to cover the minimum APGI income.");
  if (input.partnerShare !== undefined && percentageBps(input.partnerShare, "partner share") + apgiShareBps !== 10000) throw Error("The APGI and partner shares must total 100%.");
  const reason = input.reason?.trim() ?? "";
  if (reason.length < 5 || reason.length > 1000) throw Error("Explain why a tailored model is needed (5–1,000 characters).");
  return { model, apgiShareBps, reason };
}
