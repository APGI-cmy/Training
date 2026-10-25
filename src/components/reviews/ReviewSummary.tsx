import {findingLocationLabel,activeFindings,type ReviewDocument} from "@/lib/course-review";
export function ReviewSummary({document:d}:{document:ReviewDocument}){
 const findings=activeFindings(d);
 return <section aria-label="Saved feedback summary"><h3>Saved feedback summary</h3><p>{findings.filter(f=>f.outcome!=="satisfied").length} findings · {findings.filter(f=>f.outcome==="satisfied").length} “nothing to add” reviews · {findings.filter(f=>f.blocking&&f.status!=="closed").length} unresolved publication blockers.</p>{findings.length?<ul>{findings.map(f=><li key={f.id}><a href={`#finding-${f.id}`}>{findingLocationLabel(f)} · {f.reference}</a> — {f.outcome==="satisfied"?"Nothing to add":`${f.category} · ${f.status}`} · {f.author}<p>{f.text}</p></li>)}</ul>:<p>No individual findings saved. You can submit a no-issues report after completing all LU and quiz coverage.</p>}</section>;
}
