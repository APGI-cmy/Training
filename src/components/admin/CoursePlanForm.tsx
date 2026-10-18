"use client";
import "./commercial-planning.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { saveCommercialDraft } from "@/server/actions/platform-policies";
import { applicableApgiShare, costEstimate, minimumCourseQuote, moneyCents, partnerPlanningDefaults, percentageBps } from "@/lib/commercial-planning";
import type { StructureState } from "@/lib/company-structure";
import { FieldHelp } from "./FieldHelp";
import { CurrencyEquivalents } from "./AutomaticCurrencyRates";
import { ServiceCostChecklist } from "./ServiceCostChecklist";
import { calculateServiceCosts, readServiceSelection } from "@/lib/service-costs";
import { baselineRateCatalogue, type RateCatalogue } from "@/lib/service-rate-register";

export type PlanCompany = { id: string; name: string; slug: string };
export type PlanCostProfile = { id: string; title: string; configuration: Record<string, string | null> };
type Choice = { value: string; label: string };
export function PlanningField({ name, label, help, value, onChange, options, required = false, readOnly = false, placeholder }: {
  name: string; label: string; help: string; value: string; onChange: (value: string) => void;
  options?: Choice[]; required?: boolean; readOnly?: boolean; placeholder?: string;
}) {
  const id = useId();
  return <div className="planning-field"><div className="planning-field-label"><label htmlFor={id}>{label}</label><FieldHelp label={label} text={help} /></div>
    {options ? <select id={id} name={name} title={help} value={value} onChange={event => onChange(event.target.value)} required={required}>{options.map(o => <option value={o.value} key={o.value}>{o.label}</option>)}</select>
      : <input id={id} name={name} title={help} value={value} onChange={event => onChange(event.target.value)} required={required} readOnly={readOnly} placeholder={placeholder} maxLength={name.startsWith("designer_")?180:250} />}
  </div>;
}
export function CoursePlanForm({ companies, courses, costProfiles, principalId, initialCourse = "", initialBrand = "", workflowContext, catalogue=baselineRateCatalogue }: {
  companies: PlanCompany[]; courses: {slug: string; title: string}[]; costProfiles: PlanCostProfile[];
  principalId: string; initialCourse?: string; initialBrand?: string; catalogue?:RateCatalogue; workflowContext?:{id:string;ownerId:string;designerName:string;designerCompany:string;configuration?:Record<string,string|null>};
}) {
  const [state, action, pending] = useActionState<StructureState, FormData>(saveCommercialDraft, {});
  const router=useRouter();
  useEffect(()=>{if(state.success)router.refresh();},[state.success,router]);
  const [step, setStep] = useState(0); const formRef = useRef<HTMLFormElement>(null);
  const [submittedValues,setSubmittedValues]=useState("");
  const [ready, setReady] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({ course_id: initialCourse, organisation_id: initialBrand, rights_holder: "", designer_name: "", designer_company: "", development_status: "", development_cost: "0", already_paid: "0", recovery_rate: partnerPlanningDefaults.recoveryRate, currency: "USD", minimum_apgi_income: "", cost_profile_id: "", cost_mode:"services", service_costs:"", customer_source: "owner", custom_shares: "", apgi_share: "", notes: "" });
  const storageKey = (course: string) => `apgi-course-planning-v1:${principalId}:${course || "new"}`;
  useEffect(() => {
    try { const raw = sessionStorage.getItem(storageKey(initialCourse)); if (raw) {
      const saved = JSON.parse(raw); if (saved && typeof saved === "object" && Date.now() - Number(saved.time) < 86400000) {
        setValues(current => ({...current,...Object.fromEntries(Object.entries(saved.values ?? {}).filter(([key,value]) => key in current && typeof value === "string")), ...(initialBrand ? {organisation_id:initialBrand} : {})}));
      }
    }} catch { /* A browser may disable tab storage. Saving remains available. */ }
    if(workflowContext)setValues(current=>({...current,...Object.fromEntries(Object.entries(workflowContext.configuration??{}).filter(([key,value])=>key in current&&typeof value==="string")) as Record<string,string>,...(workflowContext.configuration?{custom_shares:workflowContext.configuration.agreement_scope==="partner"?"on":""}:{}),...(workflowContext.configuration?.service_cost_snapshot?{service_costs:JSON.stringify(JSON.parse(workflowContext.configuration.service_cost_snapshot).selection)}:{}),course_id:initialCourse,organisation_id:initialBrand,rights_holder:workflowContext.ownerId,designer_name:workflowContext.designerName,designer_company:workflowContext.designerCompany}));
    setReady(true);
  // The initial route identifies the draft restored on navigation back from branding.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [principalId, initialCourse, initialBrand, workflowContext]);
  useEffect(() => { if (ready) try {
    const saved=JSON.stringify({time:Date.now(),values});
    sessionStorage.setItem(storageKey(values.course_id),saved);
    // The general wizard resumes the latest course as well as its scoped route.
    sessionStorage.setItem(storageKey(""),saved);
  } catch {} }, [values, ready, principalId]);
  const update = (key: string) => (value: string) => setValues(current => {
    if(workflowContext&&["course_id","organisation_id","rights_holder","designer_name","designer_company"].includes(key))return current;
    const next={...current,[key]:value};
    if(key==="currency")try{next.service_costs=JSON.stringify({...readServiceSelection(current.service_costs),reviewed:false});}catch{next.service_costs="";}
    return next;
  });
  const field = (name: string, label: string, help: string, extra: {options?:Choice[]; required?:boolean; placeholder?:string} = {}) => {
    const locked=!!workflowContext&&["course_id","organisation_id","rights_holder","designer_name","designer_company"].includes(name);
    return <PlanningField name={name} label={label} help={locked?`${help} Recorded during approved content review; start a new content review to change it.`:help} value={values[name]??""} onChange={update(name)} {...extra} readOnly={locked} options={locked&&extra.options?extra.options.filter(o=>o.value===values[name]):extra.options}/>;
  };
  const brand = companies.find(c => c.id === values.organisation_id), owner = companies.find(c => c.id === values.rights_holder);
  const ownApgi = brand?.slug === "apgi" && owner?.slug === "apgi";
  const standardShare = applicableApgiShare(owner?.slug === "apgi", brand?.slug === "apgi", values.customer_source);
  const custom = !ownApgi && values.custom_shares === "on";
  const share = custom ? values.apgi_share : standardShare;
  const useServices=values.cost_mode!=="saved";
  const profile = costProfiles.find(p => p.id === values.cost_profile_id && p.configuration.currency === values.currency);
  let serviceResult:ReturnType<typeof calculateServiceCosts>|undefined;
  let quote: ReturnType<typeof minimumCourseQuote> | null = null, quoteError = "Choose a course, brand, legal owner and complete service assumptions, then enter the minimum APGI income.";
  try {
    if(useServices)serviceResult=calculateServiceCosts(readServiceSelection(values.service_costs),values.currency,true,catalogue);
    const estimate=useServices?serviceResult?.estimate:profile?costEstimate(profile.configuration):null;
    if (estimate && owner && brand && values.development_status && share) {
      const development = moneyCents(values.development_cost || "0", "development cost");
      const paid = values.development_status === "paid" ? development : moneyCents(values.already_paid || "0", "development already paid");
      if (paid > development || (values.development_status === "recover" && paid >= development)) throw Error("Enter a positive development balance to recover.");
      quote = minimumCourseQuote({...estimate,minimumApgiCents:moneyCents(values.minimum_apgi_income,"minimum APGI income"),apgiShareBps:percentageBps(share,"APGI share"),recoveryBps:values.development_status === "recover" ? percentageBps(values.recovery_rate,"recovery rate") : 0,outstandingCents:development-paid});
    }
  } catch (error) { quoteError = error instanceof Error ? error.message : "Check the pricing inputs."; }
  const money = (cents: number) => `${values.currency} ${(cents / 100).toFixed(2)}`;
  const advance = () => {
    const inputs = formRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement>(`[data-step="${step}"] input, [data-step="${step}"] select`);
    if (inputs && [...inputs].some(input => !input.reportValidity())) return;
    if(step===2&&!quote)return;
    setStep(current => Math.min(3,current+1));
  };
  const selectedCourse = courses.find(c => c.slug === values.course_id);
  const returnPath = values.course_id ? `/admin/courses/${values.course_id}/publish` : "/admin/agreements";
  return <form ref={formRef} action={action} onSubmit={event=>{
    const submitter=(event.nativeEvent as SubmitEvent).submitter;
    if(step!==3||!(submitter instanceof HTMLButtonElement)||submitter.name!=="intent")event.preventDefault();
    else setSubmittedValues(JSON.stringify(values));
  }}>
    {workflowContext?<input type="hidden" name="workflow_round_id" value={workflowContext.id}/>:null}
    <input type="hidden" name="workspace" value="course_plan" /><input type="hidden" name="kind" value="course_agreement" />
    <input type="hidden" name="cost_mode" value={useServices?"services":"saved"}/><input type="hidden" name="service_costs" value={values.service_costs}/>
    <input type="hidden" name="title" value={`${selectedCourse?.title ?? "Course"} — ${brand?.name ?? "Brand"}`.slice(0,150)} />
    <ol className="planning-steps" aria-label="Course preparation steps">{["Course and brand","Development","Price calculation",ownApgi?"Review APGI price":"Review terms"].map((label,index) => <li key={label} aria-current={step===index ? "step" : undefined}>{index+1}. {label}</li>)}</ol>
    <fieldset data-step="0" className="commercial-step admin-form-grid" hidden={step!==0}><legend>Course, legal owner and learner branding</legend>
      {field("course_id","Course","Select the course you have uploaded and previewed. This draft does not change learner access.",{required:true,options:[{value:"",label:"Select a course"},...courses.map(c=>({value:c.slug,label:c.title}))]})}
      {field("organisation_id","Publishing brand","Learners use this company’s identity. Brand and legal course ownership are separate.",{required:true,options:[{value:"",label:"Select a company brand"},...companies.map(c=>({value:c.id,label:c.name}))]})}
      {field("rights_holder","Current legal course owner","Declare the owner now. A planned transfer after development recovery must be recorded separately; this draft cannot transfer ownership.",{required:true,options:[{value:"",label:"Declare the legal owner"},...companies.map(c=>({value:c.id,label:c.name}))]})}
      {field("designer_name","Course designer name","Enter the person responsible for designing this course. This credit is separate from the publisher, reviewer and legal course owner.",{required:true,placeholder:"Full name"})}
      {field("designer_company","Course designer company","Enter the designer’s legal company or organisation name, including an external development company if applicable. This does not transfer course ownership.",{required:true,placeholder:"Company or organisation"})}
      {workflowContext?<p>The publishing brand is recorded in the approved content review. Start a new content review if a different publishing brand is needed.</p>:<p><Link href={`/admin/companies?returnTo=${encodeURIComponent(returnPath)}`}>Add a new brand</Link><br/><small>This tab remembers the draft for up to 24 hours while you set up the brand.</small></p>}
      {selectedCourse ? <p className="admin-span-two"><Link href={`/admin/courses/${selectedCourse.slug}/preview`}>Review course content</Link></p> : null}
    </fieldset>
    <fieldset data-step="1" className="commercial-step admin-form-grid" hidden={step!==1}><legend>Development funding and recovery</legend>
      {field("development_status","Development payment status","Choose explicitly. Paid development has no recovery deduction. Recovery ends when the remaining funded balance is repaid.",{required:true,options:[{value:"",label:"Choose payment status"},{value:"paid",label:"Development already paid"},{value:"recover",label:"Recover an outstanding development cost"}]})}
      {field("development_cost","Approved development cost","Enter the funded development amount in the selected currency. This is not an operating cost and receives no 6% administration fee.",{required:true})}
      {field("already_paid","Development amount already recovered","Amounts already paid reduce the outstanding balance. Ignored when development is fully paid.")}
      {field("recovery_rate","Development recovery (%)","Default 25% of the cost-cleared pool, before the owner/platform split. Recovery is capped at the outstanding balance.",{required:values.development_status==="recover"})}
      <p className="admin-span-two">Funding and any ownership transfer require their own approved record. Partner terms present the platform as APGI.</p>
    </fieldset>
    <fieldset data-step="2" className="commercial-step admin-form-grid" hidden={step!==2}><legend>Minimum APGI income and the course price</legend>
      {field("currency","Currency","Course price currency. Provider rates use automatic dated reference rates, unless you deliberately select a documented manual rate. USD is the draft default.",{options:["USD","CAD","EUR","GBP","ZAR"].map(value=>({value,label:value}))})}
      {field("minimum_apgi_income","Minimum APGI income per learner","What the combined APGI platform should retain after running costs, the cost-only administration fee, development recovery and the partner split. Internal APGI/SRMS distributions remain separate.",{required:true,placeholder:"Example: 100.00"})}
      {costProfiles.length?<div className="admin-span-two"><label>Cost preparation method<select value={values.cost_mode} onChange={e=>update("cost_mode")(e.target.value)}><option value="services">Select services here</option><option value="saved">Use an earlier saved estimate</option></select></label></div>:null}
      {useServices?<ServiceCostChecklist catalogue={catalogue} raw={values.service_costs} currency={values.currency} onChange={update("service_costs")}/>:field("cost_profile_id","Saved platform cost estimate","Use a previously prepared estimate in the course currency. Select services here instead to prepare one on this page.",{required:true,options:[{value:"",label:"Choose an earlier estimate"},...costProfiles.filter(p=>p.configuration.currency===values.currency).map(p=>({value:p.id,label:p.title}))]})}
      {ownApgi ? <input type="hidden" name="customer_source" value="apgi"/> : field("customer_source","Who provides the customer?","For partner-owned courses: owner-sourced gives 80% to the owner and 20% to APGI; APGI-sourced gives 60% to the owner and 40% to APGI. Both apply after costs and recovery.",{options:[{value:"owner",label:"Course owner / partner"},{value:"apgi",label:"APGI"}]})}
      {!ownApgi ? <label className="admin-span-two"><input type="checkbox" name="custom_shares" checked={custom} onChange={event=>update("custom_shares")(event.target.checked?"on":"")} /> Tailor the APGI/partner share for this draft</label> : null}
      {custom ? field("apgi_share","APGI share (%)","Combined APGI platform share of the pool after costs and recovery. The partner receives the remainder. A changed split requires acceptance of the exact terms.",{required:true}) : <p>APGI share: {share ?? "A tailored licensing schedule is required"}{share ? `% · Partner share: ${(100-Number(share)).toFixed(2)}%` : ""}</p>}
      <p className="admin-span-two">Costs and recovery are estimates for planning. Stripe fees depend on the configured account and payment route; actual costs must be reconciled.</p>
      {!quote?<p className="admin-span-two form-error" role="status">{quoteError}</p>:null}
    </fieldset>
    <fieldset data-step="3" className="commercial-step" hidden={step!==3}><legend>{ownApgi?"Review the APGI course price":"Review the draft terms"}</legend>
      {quote ? <><h3>Calculated minimum course price: {money(quote.price)}</h3><p><CurrencyEquivalents amount={(quote.price/100).toFixed(2)} from={values.currency} quote={serviceResult?.snapshot.currencyQuote}/></p><dl className="draft-fields">{[["Estimated running costs",quote.costs],["Other costs — contingency",quote.contingency],["Administration on costs (excluding reserve)",quote.administration],["Development recovery",quote.recovery],["APGI income",quote.apgi],["Partner income",quote.partner]].map(([label,value])=><div key={String(label)}><dt>{label}</dt><dd>{money(Number(value))}</dd></div>)}</dl>{serviceResult?<ul>{serviceResult.lines.map(l=><li key={l.id}>{l.name}: {l.plan} — {money(l.fixedCents)}{l.rateBps?` + ${l.rateBps/100}% of price`:""}</li>)}</ul>:null}<p>{selectedCourse?.title} · {brand?.name} · Legal owner: {owner?.name}</p><p>Course designer: {values.designer_name} · {values.designer_company}</p><p>The course price must not fall below this calculated floor under these assumptions. The partner may propose a higher price. Recovery stops at the recorded balance; actual payments and refunds must be reconciled.</p></> : <p className="form-error" role="alert">{quoteError}</p>}
      <label title="Record any exception that must be included in the approval schedule.">Notes for the agreement<textarea name="notes" value={values.notes} onChange={event=>update("notes")(event.target.value)} maxLength={5000} rows={3}/></label>
      <p className="notice-card">Save this exact commercial version, then continue to joint APGI commercial sign-off. Content approval is separate and must already be recorded for an active publication workflow. Saving alone does not send invitations, accept terms, publish the course or activate a payment.</p>
    </fieldset>
    <div className="planning-controls">{step>0 ? <button key="back" type="button" className="secondary-button" onClick={()=>setStep(current=>current-1)}>Back</button> : null}{step<3 ? <button key="continue" type="button" className="primary-button" onClick={event=>{event.preventDefault();advance();}}>Continue</button> : <button key="save-draft" type="submit" name="intent" value="save_course_draft" className="primary-button" disabled={pending||!quote}>{pending?"Saving…":"Save course and terms draft"}</button>}</div>
    {state.error ? <p role="alert" className="form-error">{state.error}</p> : null}{state.success ? <p role="status" className="form-success">{state.success}</p> : null}{state.link&&!pending&&submittedValues===JSON.stringify(values)?<p><Link className="primary-button" href={state.link}>Continue publication workflow</Link></p>:null}
  </form>;
}
