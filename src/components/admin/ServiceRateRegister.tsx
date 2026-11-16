"use client";
import { useActionState } from "react";
import { costServices } from "@/lib/service-costs";
import { rateDefinitions, catalogueDate, type RateCatalogue } from "@/lib/service-rate-register";
import { reviewServiceRates, checkServiceSources } from "@/server/actions/service-rate-register";
import type { StructureState } from "@/lib/company-structure";
import "./commercial-planning.css";

export function ServiceRateRegister({catalogue}:{catalogue:RateCatalogue}) {
  const [state,action,pending]=useActionState<StructureState,FormData>(reviewServiceRates,{});
  const [check,checkAction,checking]=useActionState<StructureState,FormData>(checkServiceSources,{});
  return <>
    <section className="admin-form-card"><h2>Check the official sources</h2><p>The scheduled check runs daily at 07:00 South African time. It extracts visible price figures and flags changes or unreadable pages. Figures must be matched to their plan, country, currency and included allowances before they become calculator rates. A successful page check is not a price approval.</p>
      <form action={checkAction}><button className="secondary-button" disabled={checking}>{checking?"Checking sources…":"Check sources now"}</button></form>
      {check.success?<p role="status">{check.success}</p>:null}{check.error?<p role="alert">{check.error}</p>:null}
    </section>
    <section className="admin-form-card"><h2>Reviewed calculator rates</h2><p>Last reviewed {catalogueDate(catalogue)}. Only the two platform principals can maintain this register. These are planning rates; this page does not approve a cost distribution or alter an agreement.</p>
      <form key={catalogue.version} action={action}><input type="hidden" name="version" value={catalogue.version}/>
        {costServices.filter(s=>s.source).map(service=><fieldset className="rate-provider" key={service.id}><legend>{service.name}</legend><p>{service.note} <a href={service.source} target="_blank" rel="noopener noreferrer">Official pricing ↗</a></p>
          <div className="service-table-wrap"><table className="rate-table"><caption>{service.name} rate table</caption><thead><tr><th>Plan / charge</th><th>Rate</th><th>Currency / unit</th></tr></thead><tbody>{rateDefinitions.filter(d=>d.service===service.id).map(d=><tr key={d.key}><th scope="row"><label htmlFor={`rate-${d.key}`}>{d.label}</label></th><td><input id={`rate-${d.key}`} name={d.key} defaultValue={catalogue.values[d.key]} inputMode="decimal" required maxLength={14} title={`Reviewed ${d.currency} amount ${d.unit}; verify the official source before changing this rate.`}/></td><td>{d.currency} {d.unit}</td></tr>)}</tbody></table></div>
          {service.id==="aws"?<p>Streaming compute is region and instance specific. Keep the dated hourly quote and usage in the course; the register supplies only the listed licence charges.</p>:null}
          {service.id==="ai"?<p>Other model names do not inherit these prices. Record the exact provider model and processing tier as a custom course quote.</p>:null}
        </fieldset>)}
        <label>Review evidence and reason<textarea name="review_note" minLength={10} maxLength={2000} rows={3} required placeholder="Sources checked, date, relevant plan or invoice, and what changed."/></label>
        <label className="service-choice"><input name="reviewed" type="checkbox" required/><span>I checked all rates, units, country, currency and plan allowances against the official sources. I understand this creates a new planning-rate version.</span></label>
        <button className="primary-button" disabled={pending}>{pending?"Saving reviewed rates…":"Save reviewed rate version"}</button>
        {state.success?<p role="status">{state.success}</p>:null}{state.error?<p className="form-error" role="alert">{state.error}</p>:null}
      </form>
    </section>
  </>;
}
