import {allocationAtPrice, type PlanningInput} from "./commercial-planning";

// Minor units only. This calculation is repeated under a recovery-pool lock in SQL.
export function settledAllocation(price:number, actualFee:number, input:PlanningInput) {
 if(!Number.isSafeInteger(price)||price<=0||!Number.isSafeInteger(actualFee)||actualFee<0||actualFee>price)throw Error("Invalid confirmed payment amounts.");
 const allocation=allocationAtPrice(price,{...input,stripeFixedCents:actualFee,stripeRateBps:0});
 if(allocation.shortfall||allocation.apgi<input.minimumApgiCents)throw Error("Actual costs require commercial reconciliation before payout.");
 if(allocation.costs+allocation.administration+allocation.contingency+allocation.recovery+allocation.apgi+allocation.partner!==price)throw Error("Settlement does not balance.");
 return allocation;
}
