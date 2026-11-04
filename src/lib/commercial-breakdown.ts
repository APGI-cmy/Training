import {allocationAtPrice} from './commercial-planning';
import {commercialInput,type CommercialVersion} from './publication-workflow';
export function commercialBreakdown(version:CommercialVersion) {
 const input=commercialInput(version.configuration),price=version.proposedPrice;
 if(!Number.isSafeInteger(price)||price<0||price>1e12)throw Error('The saved learner price is invalid.');
 const initial=allocationAtPrice(price,input),settled=allocationAtPrice(price,{...input,outstandingCents:0,recoveryBps:0});
 const charge=(fixed:number,bps:number)=>fixed+Number((BigInt(price)*BigInt(bps)+BigInt(9999))/BigInt(10000));
 const stripe=charge(input.stripeFixedCents,input.stripeRateBps),hosting=charge(input.hostingFixedCents,input.hostingRateBps);
 const costs:{name:string;cents:number;basis?:string}[]=[];
 try {
  const snapshot=JSON.parse(version.configuration.service_cost_snapshot??'null');
  if(Array.isArray(snapshot?.lines)&&snapshot.lines.length<=100)for(const line of snapshot.lines)
   if(line.id!=='stripe'&&typeof line.name==='string'&&Number.isSafeInteger(line.fixedCents)&&line.fixedCents>=0&&Number.isSafeInteger(line.rateBps)&&line.rateBps>=0&&line.rateBps<=10000)
    costs.push({name:line.name,cents:charge(line.fixedCents,line.rateBps),basis:typeof line.basis==='string'?line.basis:undefined});
 } catch { /* Older proposals still have the saved aggregate cost estimate. */ }
 if(!costs.length||costs.reduce((sum,line)=>sum+line.cents,0)!==hosting)costs.splice(0,costs.length,{name:'Hosting and other configured operating services',cents:hosting,basis:'Saved aggregate allocation; provider detail is unavailable or does not reconcile to this version.'});
 const internal=(margin:number)=>{const apgi=Math.floor(margin/2);return {apgi,srms:margin-apgi};};
 return {price,stripe,hosting,costs,initial,settled,input,recoveryActive:input.recoveryBps>0&&input.outstandingCents>0,initialInternal:internal(initial.apgi),settledInternal:internal(settled.apgi),marginPercent:(cents:number)=>price>0?`${(cents/price*100).toFixed(2)}%`:'Not applicable'};
}
