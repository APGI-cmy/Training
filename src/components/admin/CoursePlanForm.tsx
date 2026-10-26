"use client";
import {SummaryText} from "@/components/shared/SummaryText";

import "./commercial-planning.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { saveCommercialDraft } from "@/server/actions/platform-policies";
import { applicableApgiShare, costEstimate, courseOwnershipSummary, minimumCourseQuote, moneyCents, ownershipModelLabels, partnerPlanningDefaults, percentageBps, resolvePlanSharing, restoreSharingModel, sharingModelLabels, validatePlanOwnership } from "@/lib/commercial-planning";
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
export function PlanSharingFields({model,apgiShare,reason,standardShare,onChange}:{
  model:string;apgiShare:string;reason:string;standardShare:string|null;onChange:(key:string,value:string)=>void;
}) {
  let partnerShare="";
  try { partnerShare=((10000-percentageBps(apgiShare,"APGI share"))/100).toFixed(2); } catch { /* Keep the remainder empty until a valid percentage is entered. */ }
  return <>
    <PlanningField name="sharing_model" label="Who provides the customer? / Sharing model" help="Course owner / partner: 80% partner and 20% APGI. APGI: 60% partner and 40% APGI. Tailored model: enter a different agreed split and explain why. Operating costs are cleared first. Development recovery comes from the partner's share, separately from APGI's ongoing platform share." value={model} onChange={value=>onChange("sharing_model",value)} options={Object.entries(sharingModelLabels).map(([value,label])=>({value,label}))}/>
    {model==="tailored"?<fieldset className="admin-span-two tailored-sharing"><legend>Tailored APGI / partner model</legend><div className="admin-form-grid">
      <PlanningField name="apgi_share" label="APGI share (%)" help="Ongoing APGI share after operating costs, excluding development recovery. The partner remainder is calculated automatically; the two shares total 100%." value={apgiShare} onChange={value=>onChange("apgi_share",value)} required/>
      <PlanningField name="platform_user_share" label="Partner share (%)" help="Automatically calculated as 100% minus the APGI share. Change APGI's percentage to adjust this remainder." value={partnerShare} onChange={()=>{}} readOnly/>
      <label className="admin-span-two">Reason for the tailored model<textarea name="tailored_reason" value={reason} onChange={event=>onChange("tailored_reason",event.target.value)} required minLength={5} maxLength={1000} rows={3}/></label>
    </div><p>These percentages and the reason will be included in the draft terms for approval.</p></fieldset>:standardShare?<p className="notice-card" role="status"><strong>Standard model: APGI {Number(standardShare).toFixed(2)}% · Partner {(100-Number(standardShare)).toFixed(2)}%</strong><br/>Applied automatically after operating costs. Recovery is deducted from the partner share. Select Tailored model only to propose a different arrangement.</p>:<p className="notice-card">An APGI-owned course under a partner brand needs a tailored licensing model unless it is under development recovery.</p>}
  </>;
}
export function CoursePlanForm({ companies, courses, costProfiles, principalId, initialCourse = "", initialBrand = "", workflowContext, catalogue=baselineRateCatalogue }: {
  companies: PlanCompany[]; courses: {slug: string; title: string}[]; costProfiles: PlanCostProfile[];
  principalId: string; initialCourse?: string; initialBrand?: string; catalogue?:RateCatalogue; workflowContext?:{id:string;ownerId:string;partnerCompanyId?:string;designerName:string;designerCompany:string;configuration?:Record<string,string|null>};
}) {
  const [state, action, pending] = useActionState<StructureState, FormData>(saveCommercialDraft, {});
  const router=useRouter();
  useEffect(()=>{if(state.success&&!workflowContext)router.refresh();},[state.success,router,workflowContext]);
  const [step, setStep] = useState(0); const formRef = useRef<HTMLFormElement>(null);
  const [submittedValues,setSubmittedValues]=useState("");
  const [ready, setReady] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({ course_id: initialCourse, organisation_id: initialBrand, rights_holder: "", ownership_model:"", client_owner_id:workflowContext?.partnerCompanyId??initialBrand, designer_name: "", designer_company: "", development_status: "", development_cost: "0", already_paid: "0", recovery_rate: partnerPlanningDefaults.recoveryRate, currency: "USD", minimum_apgi_income: "", cost_profile_id: "", cost_mode:"services", service_costs:"", sharing_model: "owner", apgi_share: "", tailored_reason:"", notes: "" });
  const storageKey = (course: string) => `apgi-course-planning-v1:${principalId}:${course || "new"}${workflowContext?`:workflow:${workflowContext.id}`:""}`;
  useEffect(() => {
    try { const raw = sessionStorage.getItem(storageKey(initialCourse)); if (raw) {
      const saved = JSON.parse(raw); if (saved && typeof saved === "object" && Date.now() - Number(saved.time) < 86400000) {
        setValues(current => ({...current,...Object.fromEntries(Object.entries(saved.values ?? {}).filter(([key,value]) => key in current && typeof value === "string")),sharing_model:restoreSharingModel(saved.values??{}), ...(initialBrand ? {organisation_id:initialBrand} : {})}));
      }
    }} catch { /* A browser may disable tab storage. Saving remains available. */ }
    if(workflowContext)setValues(current=>({...current,...Object.fromEntries(Object.entries(workflowContext.configuration??{}).filter(([key,value])=>key in current&&typeof value==="string")) as Record<string,string>,...(workflowContext.configuration?{sharing_model:restoreSharingModel(workflowContext.configuration)}:{}),...(workflowContext.configuration?.service_cost_snapshot?{service_costs:JSON.stringify(JSON.parse(workflowContext.configuration.service_cost_snapshot).selection)}:{}),course_id:initialCourse,organisation_id:initialBrand,rights_holder:workflowContext.ownerId,designer_name:workflowContext.designerName,designer_company:workflowContext.designerCompany}));
    setReady(true);
  // The initial route identifies the draft restored on navigation back from branding.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [principalId, initialCourse, initialBrand, workflowContext]);
  useEffect(() => { if (ready) try {
    const saved=JSON.stringify({time:Date.now(),values});
    sessionStorage.setItem(storageKey(values.course_id),saved);
    // The general wizard resumes the latest course as well as its scoped route.
    if(!workflowContext)sessionStorage.setItem(storageKey(""),saved);
  } catch {} }, [values, ready, principalId]);
  const update = (key: string) => (value: string) => setValues(current => {
    if(workflowContext&&["course_id","organisation_id","rights_holder","designer_name","designer_company"].includes(key))return current;
    const next={...current,[key]:value};
    if(key==="ownership_model"&&value==="apgi_until_recovered")next.development_status="recover";
    if(key==="ownership_model"&&value==="partner_paid")next.development_status="paid";
    if(key==="currency")try{next.service_costs=JSON.stringify({...readServiceSelection(current.service_costs),reviewed:false});}catch{next.service_costs="";}
    return next;
  });
  const field = (name: string, label: string, help: string, extra: {options?:Choice[]; required?:boolean; placeholder?:string} = {}) => {
    const locked=!!workflowContext&&["course_id","organisation_id","rights_holder","designer_name","designer_company"].includes(name);
    return <PlanningField name={name} label={label} help={locked?`${help} Recorded for this course review; start a new content review to change it.`:help} value={values[name]??""} onChange={update(name)} {...extra} readOnly={locked} options={locked&&extra.options?extra.options.filter(o=>o.value===values[name]):extra.options}/>;
  };
  const brand = companies.find(c => c.id === values.organisation_id), owner = companies.find(c => c.id === values.rights_holder);
  const partnerRecovery = values.ownership_model === "apgi_until_recovered";
  const ownApgi = brand?.slug === "apgi" && owner?.slug === "apgi" && !partnerRecovery;
  const clientOwner=companies.find(c=>c.id===(values.ownership_model==="partner_paid"?values.rights_holder:values.client_owner_id));
  const ownershipSummary=courseOwnershipSummary({...values,client_owner_name:clientOwner?.name});
  const standardShare = applicableApgiShare(owner?.slug === "apgi", brand?.slug === "apgi", values.sharing_model,partnerRecovery);
  const useServices=values.cost_mode!=="saved";
  const profile = costProfiles.find(p => p.id === values.cost_profile_id && p.configuration.currency === values.currency);
  let serviceResult:ReturnType<typeof calculateServiceCosts>|undefined;
  let quote: ReturnType<typeof minimumCourseQuote> | null = null, quoteError = "";
  try {
    if(!courses.some(course=>course.slug===values.course_id))throw Error("Choose a course in Step 1 — Course and brand.");
    if(!brand||!owner)throw Error("Choose the publishing brand and current legal owner in Step 1 — Course and brand.");
    if(!values.development_status)throw Error("Choose the development payment status in Step 2 — Development.");
    validatePlanOwnership(values.ownership_model,owner.slug==="apgi",values.development_status,!!clientOwner&&clientOwner.slug!=="apgi");
    if(!values.minimum_apgi_income.trim())throw Error("Enter the minimum APGI income per learner above.");
    const sharing=resolvePlanSharing({model:ownApgi?"apgi":values.sharing_model,ownerIsApgi:owner.slug==="apgi",brandIsApgi:brand.slug==="apgi",partnerRecovery,apgiShare:values.apgi_share,reason:values.tailored_reason});
    if(useServices)serviceResult=calculateServiceCosts(readServiceSelection(values.service_costs),values.currency,true,catalogue);
    const estimate=useServices?serviceResult?.estimate:profile?costEstimate(profile.configuration):null;
    if(!estimate)throw Error("Choose a complete saved cost estimate, or select and review the services used by this course.");
    {
      const development = moneyCents(values.development_cost || "0", "development cost");
      const paid = values.development_status === "paid" ? development : moneyCents(values.already_paid || "0", "development already paid");
      if (paid > development || (values.development_status === "recover" && paid >= development)) throw Error("Enter a positive development balance to recover.");
      quote = minimumCourseQuote({...estimate,minimumApgiCents:moneyCents(values.minimum_apgi_income,"minimum APGI income"),apgiShareBps:sharing.apgiShareBps,recoveryBps:values.development_status === "recover" ? percentageBps(values.recovery_rate,"recovery rate") : 0,outstandingCents:development-paid,recoveryBase:ownApgi?"cost_cleared_pool":"partner_share"});
    }
  } catch (error) { quoteError = error instanceof Error ? error.message : "Check the pricing inputs."; }
  const money = (cents: number) => `${values.currency} ${(cents / 100).toFixed(2)}`;
  const advance = () => {
    const inputs = formRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[data-step="${step}"] input, [data-step="${step}"] select, [data-step="${step}"] textarea`);
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
      {field("ownership_model","Course ownership / sale conditions","Record ownership explicitly. Income sharing, company branding and development recovery are separate decisions. These conditions form part of the exact draft reviewed for approval.",{required:true,options:[{value:"",label:"Choose the ownership conditions"},...Object.entries(ownershipModelLabels).map(([value,label])=>({value,label}))]})}
      {partnerRecovery?field("client_owner_id","Client who owns the course after full recovery","Name the legal company receiving ownership after the full approved development price has been recovered.",{required:true,options:[{value:"",label:"Choose the client"},...companies.filter(c=>c.slug!=="apgi").map(c=>({value:c.id,label:c.name}))]}):null}
      {field("designer_name","Course designer name","Enter the person responsible for designing this course. This credit is separate from the publisher, reviewer and legal course owner.",{required:true,placeholder:"Full name"})}
      {field("designer_company","Course designer company","Enter the designer’s legal company or organisation name, including an external development company if applicable. This does not transfer course ownership.",{required:true,placeholder:"Company or organisation"})}
      {workflowContext?<p>The publishing brand is recorded for this course review. Start a new content review if a different publishing brand is needed.</p>:<p><Link href={`/admin/companies?returnTo=${encodeURIComponent(returnPath)}`}>Add a new brand</Link><br/><small>This tab remembers the draft for up to 24 hours while you set up the brand.</small></p>}
      {selectedCourse ? <p className="admin-span-two"><Link href={`/admin/courses/${selectedCourse.slug}/preview`}>Review course content</Link></p> : null}
    </fieldset>
    <fieldset data-step="1" className="commercial-step admin-form-grid" hidden={step!==1}><legend>Development funding and recovery</legend>
      {field("development_status","Development payment status","Paid development has no recovery deduction. Ownership after recovery requires an outstanding balance. These payment conditions must agree with the ownership model.",{required:true,options:values.ownership_model==="apgi_until_recovered"?[{value:"recover",label:"Recover an outstanding development cost"}]:values.ownership_model==="partner_paid"?[{value:"paid",label:"Development already paid"}]:[{value:"",label:"Choose payment status"},{value:"paid",label:"Development already paid"},{value:"recover",label:"Recover an outstanding development cost"}]})}
      {field("development_cost","Approved development cost","Enter the funded development amount in the selected currency. This is not an operating cost and receives no 6% administration fee.",{required:true})}
      {field("already_paid","Development amount already recovered","Amounts already paid reduce the outstanding balance. Ignored when development is fully paid.")}
      {field("recovery_rate","Development recovery (%)",ownApgi?"Internal APGI development recovery from the cost-cleared pool, capped at the outstanding balance.":"Default 25% of the partner's share after APGI's ongoing platform share is set aside. For an 80/20 split, a pool of 100 gives APGI 20, recovery 20 (25% of 80), and the client 60. Recovery stops when the full balance is repaid.",{required:values.development_status==="recover"})}
      <p className="admin-span-two">Funding and any ownership transfer require their own approved record. Partner terms present the platform as APGI.</p>
    </fieldset>
    <fieldset data-step="2" className="commercial-step admin-form-grid" hidden={step!==2}><legend>Minimum APGI income and the course price</legend>
      {field("currency","Currency","Course price currency. Provider rates use automatic dated reference rates, unless you deliberately select a documented manual rate. USD is the draft default.",{options:["USD","CAD","EUR","GBP","ZAR"].map(value=>({value,label:value}))})}
      {field("minimum_apgi_income","Minimum APGI income per learner","Ongoing platform income after operating costs and the partner split, excluding development recovery. Recovery is additional and does not reduce this ongoing share. Internal APGI/SRMS distributions remain separate.",{required:true,placeholder:"Example: 100.00"})}
      {costProfiles.length?<div className="admin-span-two"><label>Cost preparation method<select value={values.cost_mode} onChange={e=>update("cost_mode")(e.target.value)}><option value="services">Select services here</option><option value="saved">Use an earlier saved estimate</option></select></label></div>:null}
      {useServices?<ServiceCostChecklist catalogue={catalogue} raw={values.service_costs} currency={values.currency} onChange={update("service_costs")}/>:field("cost_profile_id","Saved platform cost estimate","Use a previously prepared estimate in the course currency. Select services here instead to prepare one on this page.",{required:true,options:[{value:"",label:"Choose an earlier estimate"},...costProfiles.filter(p=>p.configuration.currency===values.currency).map(p=>({value:p.id,label:p.title}))]})}
      {ownApgi ? <><input type="hidden" name="sharing_model" value="apgi"/><p>APGI share: 100% · Partner share: 0%</p></> : <PlanSharingFields model={values.sharing_model} apgiShare={values.apgi_share} reason={values.tailored_reason} standardShare={standardShare} onChange={(key,value)=>update(key)(value)}/>}
      {partnerRecovery?<p className="admin-span-two notice-card">APGI remains the legal owner until the approved development price is fully recovered. Recovery is {values.recovery_rate}% of the partner share, separately from APGI's ongoing share. When recovery ends, ownership passes to {clientOwner?.name??"the named client"} and the ongoing split continues.</p>:null}
      {!ownApgi&&workflowContext?.configuration&&workflowContext.configuration.recovery_base!=="partner_share"?<p className="admin-span-two notice-card">This revision deducts development recovery from the client share. The earlier saved version keeps its original calculation. Save and obtain fresh approval for this exact version before it can apply.</p>:null}
      <p className="admin-span-two">Costs and recovery are estimates for planning. Stripe fees depend on the configured account and payment route; actual costs must be reconciled.</p>
      {!quote?<p className="admin-span-two form-error" role="status">{quoteError}</p>:null}
    </fieldset>
    <fieldset data-step="3" className="commercial-step" hidden={step!==3}><legend>{ownApgi?"Review the APGI course price":"Review the draft terms"}</legend>
      {quote ? <><h3>Calculated minimum course price: {money(quote.price)}</h3><p><CurrencyEquivalents amount={(quote.price/100).toFixed(2)} from={values.currency} quote={serviceResult?.snapshot.currencyQuote}/></p><dl className="draft-fields">{[["Estimated running costs",quote.costs],["Other costs — contingency",quote.contingency],["Administration on costs (excluding reserve)",quote.administration],["Development recovery — separate from ongoing income",quote.recovery],["APGI ongoing platform income",quote.apgi],["Partner income",quote.partner]].map(([label,value])=><div key={String(label)}><dt>{label}</dt><dd>{money(Number(value))}</dd></div>)}</dl>{serviceResult?<ul>{serviceResult.lines.map(l=><li key={l.id}>{l.name}: {l.plan} — {money(l.fixedCents)}{l.rateBps?` + ${l.rateBps/100}% of price`:""}</li>)}</ul>:null}<p>{selectedCourse?.title} · {brand?.name} · Legal owner: {owner?.name}</p><p>Course designer: {values.designer_name} · {values.designer_company}</p><p>The course price must not fall below this calculated floor under these assumptions. The partner may propose a higher price. Recovery stops at the recorded balance; actual payments and refunds must be reconciled.</p></> : <p className="form-error" role="alert">{quoteError}</p>}
      <label title="Record any exception that must be included in the approval schedule.">Notes for the agreement<textarea name="notes" value={values.notes} onChange={event=>update("notes")(event.target.value)} maxLength={5000} rows={3}/></label>
      <p>Sharing model: <strong>{ownApgi?"APGI-owned and APGI-branded course":sharingModelLabels[values.sharing_model as keyof typeof sharingModelLabels]}</strong>. APGI {ownApgi?"100":values.sharing_model==="tailored"?values.apgi_share:standardShare}% · Partner {ownApgi?"0":(100-Number(values.sharing_model==="tailored"?values.apgi_share:standardShare)).toFixed(2)}% after operating costs{ownApgi?" and internal recovery":"; development recovery is deducted from the partner share"}.</p>
      {values.sharing_model==="tailored"&&!ownApgi?<p>Reason for the tailored model: {values.tailored_reason}</p>:null}
      {ownershipSummary?<div className="notice-card"><SummaryText commercial text={ownershipSummary}/></div>:null}
      <p className="notice-card">Save this exact commercial version, then continue to joint APGI commercial sign-off. Content approval is separate and must already be recorded for an active publication workflow. Saving alone does not send invitations, accept terms, publish the course or activate a payment.</p>
    </fieldset>
    <div className="planning-controls">{step>0 ? <button key="back" type="button" className="secondary-button" onClick={()=>setStep(current=>current-1)}>Back</button> : null}{step<3 ? <button key="continue" type="button" className="primary-button" disabled={step===2&&!quote} onClick={event=>{event.preventDefault();advance();}}>Continue</button> : <button key="save-draft" type="submit" name="intent" value="save_course_draft" className="primary-button" disabled={pending||!quote}>{pending?"Saving…":"Save course and terms draft"}</button>}</div>
    {state.error ? <p role="alert" className="form-error">{state.error}</p> : null}{state.success ? <p role="status" className="form-success">{state.success}</p> : null}{state.link&&!pending?<div>{submittedValues!==JSON.stringify(values)?<p>Continue opens the saved version. Save again to include any later changes made on this page.</p>:null}<p><Link className="primary-button" href={state.link}>Continue with saved commercial version</Link></p></div>:null}
  </form>;
}
