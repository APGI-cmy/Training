export function SavedServiceCosts({snapshot}:{snapshot?:string|null}) {
  if(!snapshot)return null;
  try {
    const value=JSON.parse(snapshot);
    if(!value||!Array.isArray(value.lines)||typeof value.currency!=="string")return null;
    return <details><summary>Service assumptions saved with this draft</summary><p>Rate catalogue {value.catalogueVersion} · checked {value.checkedOn} · {value.enrolments} expected paid enrolments/month.</p>{typeof value.selection?.contingency==="string"?<p>Other-cost contingency: {value.selection.contingency}% of estimated operating costs; separate from administration. This is a reserve, not an incurred expense.</p>:null}<ul>{value.lines.map((line:{id:string;name:string;plan:string;basis:string;fixedCents:number;rateBps:number})=><li key={line.id}><strong>{line.name}</strong>: {line.plan}<br/>{line.basis}<br/>{value.currency} {(line.fixedCents/100).toFixed(2)}{line.rateBps?` + ${line.rateBps/100}% of price`:""}</li>)}</ul><p>This is the saved estimate. It is not recalculated using newer rates.</p></details>;
  }catch{return <p>Earlier service details are unavailable; retain the saved agreement totals.</p>;}
}
