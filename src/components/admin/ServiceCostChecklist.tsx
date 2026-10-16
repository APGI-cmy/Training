"use client";
import { useId } from "react";
import { calculateServiceCosts, costServices, newServiceSelection, RATE_CHECKED, RATE_VERSION, readServiceSelection, type ServiceSelection } from "@/lib/service-costs";
import { FieldHelp } from "./FieldHelp";

function CostInput({label,value,change,help,options,required=true}:{label:string;value:string;change:(v:string)=>void;help:string;options?:{value:string;label:string}[];required?:boolean}) {
  const id=useId();return <div className="planning-field"><div className="planning-field-label"><label htmlFor={id}>{label}</label><FieldHelp label={label} text={help}/></div>{options?<select id={id} value={value} required={required} onChange={e=>change(e.target.value)}><option value="">Choose…</option>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:<input id={id} value={value} required={required} maxLength={500} onChange={e=>change(e.target.value)} title={help}/>}</div>;
}
export function ServiceCostChecklist({raw,currency,onChange}:{raw:string;currency:string;onChange:(value:string)=>void}) {
  let selection:ServiceSelection;try{selection=readServiceSelection(raw);}catch{selection=newServiceSelection();}
  const update=(patch:Partial<ServiceSelection>)=>onChange(JSON.stringify({...selection,...patch,reviewed:false}));
  const change=(id:string,key:string,value:string)=>update({services:{...selection.services,[id]:{...selection.services[id],[key]:value}}});
  const toggle=(id:string,enabled:boolean)=>{
    const services={...selection.services};if(!enabled)delete services[id];else services[id]={plan:costServices.find(s=>s.id===id)?.plans?.[0]?.id??(id==="ai"?"terra":""),units:"1",extra_monthly:"0",extra_per_learner:"0",extra_percent:"0",months:"1",licence:"single"};
    update({services});
  };
  let result:ReturnType<typeof calculateServiceCosts>|undefined,error="";
  try{result=calculateServiceCosts(selection,currency);}catch(e){error=e instanceof Error?e.message:"Check the selected services.";}
  const money=(cents:number)=>`${currency} ${(cents/100).toFixed(2)}`;
  return <section className="service-costs admin-span-two" aria-labelledby="service-cost-heading">
    <h3 id="service-cost-heading">Services used by this course</h3>
    <p>Tick each service you use. Published plan rates supply the starting costs; enter the usage and any extra allowance here. These choices budget costs; they do not subscribe to or enable services.</p>
    <div className="admin-form-grid">
      <CostInput label="Expected monthly paid course enrolments" value={selection.enrolments} change={enrolments=>update({enrolments})} help="Total paid course enrolments across the platform in a typical month. Shared monthly costs are divided by this count once, not charged in full to every course. Use the same monthly basis across courses; override the sharing count for a service dedicated to fewer courses."/>
      <CostInput label="Administration on costs (%)" value={selection.administration} change={administration=>update({administration})} help="Default 6% of eligible service costs, not 6% of the full course price. Development recovery is separate."/>
      {currency!=="USD"&&Object.keys(selection.services).some(s=>s!=="stripe")?<CostInput label={`USD 1 in ${currency}`} value={selection.usdFx} change={usdFx=>update({usdFx})} help={`Enter your documented planning exchange rate: the value of one US dollar in ${currency}. Provider rates below are USD. No exchange rate is silently assumed.`}/>:null}
      {selection.services.stripe&&selection.services.stripe.plan!=="custom"&&currency!=="CAD"?<CostInput label={`CAD 1 in ${currency}`} value={selection.cadFx} change={cadFx=>update({cadFx})} help={`Canada Stripe fixed fees are CAD. Enter the value of CAD 1 in ${currency}; currency-conversion processing charges are a separate percentage.`}/>:null}
    </div>
    <div className="service-options">{costServices.map(service=>{
      const f=selection.services[service.id];
      const input=(key:string,label:string,help:string,options?:{value:string;label:string}[],required=true)=><CostInput key={key} label={label} help={help} value={f?.[key]??""} options={options} required={required} change={v=>change(service.id,key,v)}/>;
      return <div className={`service-option${f?" is-selected":""}`} key={service.id}>
        <label className="service-choice"><input type="checkbox" checked={!!f} onChange={e=>toggle(service.id,e.target.checked)}/><strong>{service.name}</strong></label>
        {f?<div className="service-details"><p>{service.note} {service.source?<a href={service.source} target="_blank" rel="noopener noreferrer">Official pricing ↗</a>:null}</p>
          <div className="admin-form-grid">
            {service.plans?<>
              {input("plan",`${service.name} plan`,"Choose the plan being budgeted. A quoted rate can replace the published base.",[...service.plans.map(p=>({value:p.id,label:p.label})),{value:"custom",label:"Own quoted monthly rate (USD)"}])}
              {input("units",`${service.id} plan / instance quantity`,"How many paid plans, seats or instances does this base amount represent? Avoid counting included compute twice.")}
              {f.plan==="custom"?<>{input("monthly",`${service.id} quoted monthly amount (USD)`,"Monthly amount for one unit, after credits. Include your actual contracted price.")}{input("evidence",`${service.id} quote or invoice reference`,"Identify the plan, quote, invoice or rate source. Do not enter credentials or bank details.")}</>:null}
              {input("extra_monthly",`${service.id} additional monthly allowance (USD)`,"Expected overages, extra seats, disk, provider taxes and add-ons not included in the base. Zero means explicitly budgeting within the included allowances.")}
            </>:null}
            {service.id==="aws"?<>
              {input("evidence","AWS region, instance and quote reference","For example: Ireland, the configured fleet type and the dated AWS calculator quote. No region rate is guessed.")}
              {input("hourly","AWS streaming hourly quote (USD)","Use the actual region and instance rate from AWS pricing or your quote. Up to six decimals.")}
              {input("hours","AWS practice hours per enrolment","Total expected streaming hours for this course enrolment.")}
              {input("licence","AWS fleet licence","Windows single-session USD 4.19 and multi-session USD 6.42 per active user-month. Linux has no Windows licence charge. Avoid counting a shared active user-month twice across courses.",[{value:"single",label:"Windows single-session — USD 4.19/user-month"},{value:"multi",label:"Windows multi-session — USD 6.42/user-month"},{value:"linux",label:"Linux — no Windows licence fee"}])}
              {input("months","AWS active licence months per enrolment","Expected months in which a learner uses the Windows lab; at least one for an active course.")}
              {input("extra_monthly","AWS idle and other monthly allowance (USD)","Include stopped fleet capacity, image builders, IPv4, storage and transfer. Enter a quoted allowance, including zero only if no such costs apply.")}
            </>:null}
            {service.id==="ai"?<>
              {input("plan","AI rate model","Terra rates are USD 2 input and USD 12 output per million tokens: standard short-context text, requests at most 272K input tokens, no cache discounts. Other modes use your quote.",[{value:"terra",label:"GPT-5.6 Terra — USD 2 input / 12 output per million"},{value:"custom",label:"Another model / quoted token rates"}])}
              {f.plan==="custom"?<>{input("evidence","AI model and rate reference","Record provider, exact model, processing tier and date.")}{input("input_rate","AI input rate per million tokens (USD)","Rate for your chosen model and processing tier.")}{input("output_rate","AI output rate per million tokens (USD)","Include the applicable output/reasoning rate.")}</>:null}
              {input("input_tokens","AI input tokens per enrolment","Expected total input tokens including reused conversation context. Enter zero if none.")}
              {input("output_tokens","AI output / reasoning tokens per enrolment","Expected total billed output including reasoning. Enter zero if none.")}
              {input("extra_per_learner","AI other usage per enrolment (USD)","Allowance for tools, web search, storage, audio, images or long-context premiums not covered by these text token rates.")}
            </>:null}
            {service.id==="stripe"?<>
              {input("plan","Stripe account and payment route","Published Canadian card rates, not rates for another account country. Other services and routes require an explicit allowance or your contracted rates.",[{value:"ca_domestic",label:"Canada / domestic cards — 2.9% + CAD 0.30"},{value:"ca_international",label:"Canada / international cards — 3.7% + CAD 0.30"},{value:"ca_fx",label:"Canada / international + conversion — 5.7% + CAD 0.30"},{value:"custom",label:"Own account / contracted rates"}])}
              {f.plan==="custom"?<>{input("evidence","Stripe account country and rate reference","Identify the account country, payment method and rate source without account credentials.")}{input("rate","Stripe base percentage (%)","Contracted percentage per payment.")}{input("fixed",`Stripe fixed fee (${currency})`,"Enter the fixed fee already converted to the course currency.")}</>:null}
              {input("extra_percent","Additional Stripe charges (%)","Add applicable Connect, manual-entry or other percentage charges. Use Other operating costs for additional fixed charges.")}
            </>:null}
            {service.id==="other"?<>
              {input("evidence","Other cost description and basis","Describe the supplier, invoice or documented allowance. Avoid duplicate costs.")}
              {input("monthly","Other shared monthly costs (USD)","Shared monthly amount. Enter zero if this item has only a per-enrolment cost.")}
              {input("per_learner","Other cost per enrolment (USD)","Course-specific cost. Enter zero if this item is only shared monthly.")}
            </>:null}
            {service.id!=="ai"&&service.id!=="stripe"?input("allocation_enrolments",`${service.id} sharing enrolments (optional)`,"Leave blank to use the platform count above. For a dedicated lab or service, enter the paid monthly enrolments sharing this cost instead.",undefined,false):null}
          </div>
          {service.plans?<p className="field-hint">{service.plans.find(p=>p.id===f.plan)?.note}</p>:null}
        </div>:null}
      </div>;
    })}</div>
    {selection.version!==RATE_VERSION?<p className="form-error">The rate catalogue changed. Review the new rates, then <button type="button" onClick={()=>update({version:RATE_VERSION})}>Use current rate catalogue</button>.</p>:null}
    <p className="field-hint">Published rates checked {RATE_CHECKED}. Plans include only their stated allowances. Add applicable provider tax, overages and other charges; actual invoices are reconciled separately. Rate changes never rewrite earlier saved drafts.</p>
    {result?<div className="service-breakdown"><h4>Estimated service cost per paid enrolment</h4><div className="service-table-wrap"><table><caption>Calculated from your selected plans and usage</caption><thead><tr><th>Service</th><th>Calculation</th><th>Allowance</th></tr></thead><tbody>{result.lines.map(line=><tr key={line.id}><th scope="row">{line.name}</th><td>{line.basis}</td><td>{money(line.fixedCents)}{line.rateBps?` + ${line.rateBps/100}% of price`:""}</td></tr>)}</tbody></table></div><p><strong>Fixed running costs: {money(result.estimate.hostingFixedCents+result.estimate.stripeFixedCents)}</strong>{result.estimate.stripeRateBps?` + ${result.estimate.stripeRateBps/100}% processing.`:"."} Administration is {selection.administration}% of these costs only. The final review calculates the full price and recovery.</p></div>:<p className="notice-card" role="status">{error}</p>}
    <label className="service-choice"><input type="checkbox" checked={selection.reviewed} onChange={e=>onChange(JSON.stringify({...selection,reviewed:e.target.checked}))}/><span>I have checked the selected plans, usage, included quotas, exchange rates and extra-cost allowances. These are planning estimates.</span></label>
  </section>;
}
