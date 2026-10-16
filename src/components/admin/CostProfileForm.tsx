"use client";
import { useState } from "react";
import { StructureForm } from "./StructureForm";
import { PlanningField } from "./CoursePlanForm";
import { saveCommercialDraft } from "@/server/actions/platform-policies";
import { partnerPlanningDefaults } from "@/lib/commercial-planning";
export function CostProfileForm() {
  const [values,setValues] = useState<Record<string,string>>({title:"",currency:"USD",hosting_fixed:"",hosting_rate:"",stripe_fixed:"",stripe_rate:"",administration_rate:partnerPlanningDefaults.administrationRate,cost_period:""});
  const field=(name:string,label:string,help:string)=> <PlanningField key={name} name={name} label={label} help={help} required value={values[name]} onChange={value=>setValues(current=>({...current,[name]:value}))}/>;
  return <StructureForm action={saveCommercialDraft} label="Save planning cost profile">
    <input type="hidden" name="workspace" value="cost_profile"/><input type="hidden" name="kind" value="operating_cost"/>
    {field("title","Estimate name","For example: Standard course, or Scannex with AWS streaming. Use a new profile when the assumptions change.")}
    {field("currency","Currency","Three-letter currency, for example USD. All fixed amounts in this profile use that currency.")}
    {field("hosting_fixed","Hosting allocation per learner","Combined infrastructure allocation per learner: hosting, database, AI, Render, AWS or other applicable services. Capture the allocated cost once. Enter 0 only if no fixed allocation applies.")}
    {field("hosting_rate","Variable hosting cost (%)","Percentage of the course fee allocated to applicable variable platform services. Do not also include those same costs in the fixed allocation. Enter 0 if none.")}
    {field("stripe_fixed","Stripe fixed cost per payment","The fixed payment-processing amount for the intended account, payment route and currency. This is an estimate, not a universal Stripe rate.")}
    {field("stripe_rate","Stripe percentage (%)","Configured percentage estimate for processing, including the applicable route. Actual provider costs are reconciled later.")}
    {field("administration_rate","Administration on costs (%)","Default 6% on eligible running costs only. It is never applied to the whole course fee or development principal.")}
    {field("cost_period","Cost period and allocation assumption","State the period, expected learner volume, relevant services and evidence used to allocate costs per learner. Do not invent a zero-cost estimate.")}
    <label className="admin-span-two" title="References for the estimates and limits, without bank credentials.">Supporting notes<textarea name="notes" rows={3} maxLength={5000}/></label>
  </StructureForm>;
}
