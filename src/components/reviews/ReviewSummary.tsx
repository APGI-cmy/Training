import {findingLocationLabel,activeFindings,type ReviewDocument} from "@/lib/course-review";
import {SummaryFacts,SummaryText} from "@/components/shared/SummaryText";
export function ReviewSummary({document:d}:{document:ReviewDocument}){
 const findings=activeFindings(d);
 return <section aria-label="Saved feedback summary"><h3>Saved feedback summary</h3><ul className="summary-totals"><li>{findings.filter(f=>f.outcome!=="satisfied").length} findings</li><li>{findings.filter(f=>f.outcome==="satisfied").length} “nothing to add” reviews</li><li>{findings.filter(f=>f.blocking&&f.status!=="closed").length} unresolved publication blockers</li></ul>{findings.length?<ul className="summary-feedback-list">{findings.map(f=><li key={f.id}><h4><a href={`#finding-${f.id}`}>{findingLocationLabel(f)} · {f.reference}</a></h4><SummaryFacts entries={[["Outcome",f.outcome==="satisfied"?"Nothing to add":`${f.category} · ${f.status}`],["Reviewer",f.author]]}/><SummaryText text={f.text}/></li>)}</ul>:<p>No individual findings saved. You can submit a no-issues report after completing all LU and quiz coverage.</p>}</section>;
}
