import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { requirePlatformPrincipal } from "@/server/services/platform-principals";
import { currentRateCatalogue } from "@/server/services/service-rate-register";
import { rows } from "@/server/services/company-structure";
import { ServiceRateRegister } from "@/components/admin/ServiceRateRegister";
import { costServices } from "@/lib/service-costs";

export default async function ServiceCostsPage(){
  await requireAdmin();try{await requirePlatformPrincipal();}catch{notFound();}
  const [catalogue,checks,history]=await Promise.all([
    currentRateCatalogue(),
    rows<{source_id:string;checked_at:string;status:string;summary:string;amount_signals:string[]}>("/rest/v1/service_rate_source_checks?select=source_id,checked_at,status,summary,amount_signals&order=checked_at.desc&limit=140"),
    rows<{version:string;checked_on:string;review_note:string;created_at:string}>("/rest/v1/service_rate_catalogues?select=version,checked_on,review_note,created_at&order=created_at.desc&limit=20")
  ]);
  const date=(v:string)=>new Date(v).toLocaleString("en-GB",{timeZone:"Africa/Johannesburg"});
  const reviewDue=Date.now()-Date.parse(catalogue.checkedOn+"T00:00:00Z")>=30*86400000;
  return <main className="admin-page"><header className="admin-page-header"><div><p className="eyebrow">Private platform administration</p><h1>Service cost register</h1><p>One rate register feeds the course service checklist. Usage stays with the course; saved agreement figures stay fixed.</p></div></header>
    <nav className="planning-controls"><Link href="/admin/agreements">Back to course agreements</Link></nav>
    {reviewDue?<p className="notice-card" role="status">The reviewed rate table is at least 30 days old. Check the official prices and allowances, then save a reviewed version before relying on new course estimates.</p>:null}
    <section className="directory-card"><h2>Latest source checks</h2><p>Last automatic or manual observation, shown in South African time. A monthly human review is recommended even when price figures appear unchanged. Source checks do not verify your actual bill.</p>
      <div className="service-table-wrap"><table className="rate-table"><thead><tr><th>Service</th><th>Last checked</th><th>Result</th></tr></thead><tbody>{costServices.filter(s=>s.source).map(s=>{const c=checks.find(x=>x.source_id===s.id);return <tr key={s.id}><th scope="row">{s.name}</th><td>{c?date(c.checked_at):"No check recorded"}</td><td>{c?<><strong>{c.status==="changed"?"Possible price change":c.status==="unavailable"?"Manual check required":c.status==="observed"?"Initial observation":"No price-figure change detected"}</strong><p>{c.summary}</p><details><summary>Extracted figures — not approved rates</summary><p>{c.amount_signals.join(" · ")||"No readable prices returned."}</p></details></>:"Waiting for the first source check."}</td></tr>;})}</tbody></table></div>
    </section>
    <ServiceRateRegister catalogue={catalogue}/>
    <section className="directory-card"><h2>Rate review history</h2><p>Each saved version is retained. New rates never rewrite an earlier course snapshot.</p>{history.map(h=><details key={h.version}><summary>{date(h.created_at)} · {h.version===catalogue.version?"Current reviewed version":"Earlier version"}</summary><p>{h.review_note}</p><p>Reference: {h.version}</p></details>)}</section>
  </main>;
}
