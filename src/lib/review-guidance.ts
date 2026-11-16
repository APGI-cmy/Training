import {activeFindings,findingAppliesToUnit,type ReviewRound} from './course-review';
import {canEndorseFinding,canImplement,currentImplementation,findingPhase,luInitialReviewProgress} from './lu-review-workflow';
import {hasReviewTask} from './review-tasks';

/** Read-only projection. Counts distinct saved findings, never repeated course-wide LU appearances. */
export function reviewGuidance(round:ReviewRound,email:string,userId:string,unit?:string){
 const d=round.document,base=`/course-reviews/${round.id}`,units=d.units.filter(u=>!unit||u.slug===unit);
 const findings=activeFindings(d).filter(f=>!unit||findingAppliesToUnit(f,unit));
 const people=d.participants.filter(p=>hasReviewTask(p,'content')).map((p,index)=>{
  const records=findings.filter(f=>f.author===p.email),reports=d.reports.filter(r=>r.email===p.email);
  const first=[...records.flatMap(f=>[f.at,...(f.previousVersions??[]).map(v=>v.at)]),...reports.map(r=>r.at)].filter(a=>Number.isFinite(Date.parse(a))).sort((a,b)=>Date.parse(a)-Date.parse(b))[0];
  const progress=units.flatMap(u=>luInitialReviewProgress(round,u.slug).filter(r=>r.email===p.email));
  return {email:p.email,index,first,records,issues:records.filter(f=>f.outcome!=='satisfied'),declarations:records.filter(f=>f.outcome==='satisfied'),declined:p.state==='declined',confirmed:progress.filter(r=>r.coverage).length,deemed:progress.filter(r=>r.deemed).length,complete:progress.length>0&&progress.every(r=>r.complete)};
 }).sort((a,b)=>(a.first?Date.parse(a.first):Infinity)-(b.first?Date.parse(b.first):Infinity)||a.index-b.index);
 const actions=findings.flatMap(f=>{
  const phase=findingPhase(round,f),response=currentImplementation(round,f),href=`${base}#finding-${f.id}`,location=f.scope==='course'?'All LUs':f.unit.toUpperCase();
  if(canImplement(round,f,email,userId))return [{id:f.id,href,text:`${email}, ${phase==='Reopened'?'read the rejection reason and submit the next correction':'respond to the issue identified by '+f.author}. ${location}: ${f.reference}.`,kind:'implementation'}];
  if(canEndorseFinding(round,f,email,userId))return [{id:f.id,href,text:`${email}, ${response?response.email+' submitted a correction for '+f.author+'’s finding':'review '+f.author+'’s declaration'}. ${location}: ${f.reference}. Check the record, then endorse Yes to close it or No with a reason to reopen it.`,kind:'endorsement'}];
  return [];
 });
 const initial=units.filter(u=>luInitialReviewProgress(round,u.slug).some(p=>p.email===email&&!p.complete));
 return {base,units,findings,people,actions,initial,issues:findings.filter(f=>f.outcome!=='satisfied'),closed:findings.filter(f=>findingPhase(round,f)==='Closed'),awaiting:findings.filter(f=>findingPhase(round,f)==='Awaiting endorsement')};
}
