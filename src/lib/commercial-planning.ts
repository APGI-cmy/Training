// Draft planning only. This module creates no charge, entitlement or payout.
export const partnerPlanningDefaults = {
  currency: "USD", administrationRate: "6", recoveryRate: "25",
  recoveryBase: "cost_cleared_pool", ownerSourcedApgiShare: "20", apgiSourcedApgiShare: "40",
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
export type CostEstimate = { hostingFixedCents: number; hostingRateBps: number; stripeFixedCents: number; stripeRateBps: number; administrationBps: number };
export type PlanningInput = CostEstimate & { minimumApgiCents: number; apgiShareBps: number; recoveryBps: number; outstandingCents: number };
export function allocationAtPrice(price: number, input: PlanningInput) {
  const costs = input.hostingFixedCents + input.stripeFixedCents + rate(price, input.hostingRateBps, true) + rate(price, input.stripeRateBps, true);
  const administration = rate(costs, input.administrationBps, true);
  const available = Math.max(0, price - costs - administration);
  const recovery = Math.min(input.outstandingCents, rate(available, input.recoveryBps));
  const distributable = available - recovery;
  const apgi = rate(distributable, input.apgiShareBps);
  return { price, costs, administration, available, recovery, apgi, partner: distributable - apgi, shortfall: Math.max(0, costs + administration - price) };
}
export function minimumCourseQuote(input: PlanningInput) {
  for (const [key, value] of Object.entries(input)) if (!Number.isSafeInteger(value) || value < 0 || value > 1e12) throw new Error(`Invalid ${key}.`);
  if (!input.minimumApgiCents || input.minimumApgiCents > 1e12 || input.outstandingCents > 1e12 || input.apgiShareBps <= 0 || input.apgiShareBps > 10000 || input.recoveryBps > 10000 || input.administrationBps > 10000)
    throw new Error("Check the minimum income, shares and recovery settings.");
  if ((input.hostingRateBps + input.stripeRateBps) * (10000 + input.administrationBps) >= 100000000)
    throw new Error("Percentage costs and administration leave no revenue for this course.");
  // Recoveries and owner shares are monotone in the available pool. Individual
  // rounded provider charges are not necessarily monotone in the gross fee.
  const retained = (pool: number) => rate(pool - Math.min(input.outstandingCents, rate(pool, input.recoveryBps)), input.apgiShareBps);
  let low = 0, high = 1e12;
  if (retained(high) < input.minimumApgiCents) throw new Error("No price within the supported range covers this minimum.");
  while (low < high) { const mid = Math.floor((low + high) / 2); if (retained(mid) >= input.minimumApgiCents) high = mid; else low = mid + 1; }
  const scale = BigInt(10000), denominator = scale * scale - BigInt(input.hostingRateBps + input.stripeRateBps) * BigInt(10000 + input.administrationBps);
  const numerator = BigInt(low) * scale * scale + BigInt(input.hostingFixedCents + input.stripeFixedCents) * scale * BigInt(10000 + input.administrationBps);
  const firstPossible = Number((numerator + denominator - BigInt(1)) / denominator);
  // At most two processing round-ups plus the administration round-up separate
  // the exact lower bound from a reconciled cent-valued quote.
  const roundingWindow = Number((BigInt(2 * (10000 + input.administrationBps) + 10000) * scale + denominator - BigInt(1)) / denominator) + 2;
  if (roundingWindow > 10000) throw new Error("This cost profile leaves too little margin for an automatic quote. Review the estimate.");
  for (let price = firstPossible; price <= firstPossible + roundingWindow && price <= 1e12; price++) {
    const quote = allocationAtPrice(price,input); if (quote.apgi >= input.minimumApgiCents) return quote;
  }
  throw new Error("No price within the supported range covers this minimum.");
}
export function costEstimate(configuration: Record<string, string | null>): CostEstimate {
  const required = (key: string) => { const v = configuration[key]; if (v === null || v === undefined || v === "") throw new Error("Select a complete cost estimate. Unknown costs are not assumed to be zero."); return v; };
  return { hostingFixedCents: moneyCents(required("hosting_fixed"), "hosting allocation per learner"), hostingRateBps: percentageBps(required("hosting_rate"), "hosting percentage"), stripeFixedCents: moneyCents(required("stripe_fixed"), "Stripe fixed fee"), stripeRateBps: percentageBps(required("stripe_rate"), "Stripe percentage"), administrationBps: percentageBps(required("administration_rate"), "cost administration percentage") };
}
export function applicableApgiShare(ownerIsApgi: boolean, brandIsApgi: boolean, source: string) {
  if (ownerIsApgi && brandIsApgi) return "100";
  if (ownerIsApgi) return null; // A licensed APGI course on a partner brand needs its own agreed schedule.
  return source === "owner" ? partnerPlanningDefaults.ownerSourcedApgiShare : source === "apgi" ? partnerPlanningDefaults.apgiSourcedApgiShare : null;
}
