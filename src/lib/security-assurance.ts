import type {WatchdogCheck,WatchdogPayload} from './security-watchdog';
import {watchdogScore} from './watchdog-overview';

export const paymentAssuranceControls=[
 {id:'payment_destinations',title:'Payment links stay on approved Stripe domains'},
 {id:'payment_sandbox_keys',title:'Live payment credentials are blocked in V2'},
 {id:'payment_signatures',title:'Altered and expired payment events are rejected'},
 {id:'payment_secret_fields',title:'Platform payment forms reject card and bank-number fields'},
 {id:'payment_vault',title:'Private payment setup rejects altered encrypted data'},
 {id:'business_receiving',title:'Private receiving-account records block direct access'},
 {id:'export_foreign',title:'Company payment reports reject other-company access'},
 {id:'export_platform',title:'Company accounts cannot export all-platform payments'},
 {id:'http_webhooks',title:'Unsigned payment events are rejected'},
 {id:'payment_personal_report',title:'Personal payment exports stay with their account owner'},
] as const;
export type AssuranceAudience='principal'|'company'|'learner';
export type AssuranceSnapshot={
 audience:AssuranceAudience;context:string;automatic:boolean;phase:'running'|'finished'|'unavailable';event:string|null;
 current:boolean;checkedAt:string|null;reportHref:string;status:'checked'|'attention'|'incomplete'|'unavailable';
 payment:{passed:number;total:number;checks:{title:string;state:WatchdogCheck['state']}[]};
 overall:{passed:number;total:number;percent:number}|null;
 explanation:string;paymentMode:'sandbox';
};
// Explicit projection: never return raw report details, actor IDs, company names,
// findings, provider identifiers, credentials or other users' records to learners.
export function projectAssurance({audience,context,event,phase,payload,trusted,current,reportHref,automatic=false}:{
 audience:AssuranceAudience;context:string;event:string|null;phase:AssuranceSnapshot['phase'];
 payload:WatchdogPayload|null;trusted:boolean;current:boolean;reportHref:string;automatic?:boolean;
}):AssuranceSnapshot{
 const valid=!!payload&&trusted&&current&&payload.cleanup;
 const checks:{title:string;state:WatchdogCheck['state']}[]=paymentAssuranceControls.map(c=>({title:c.title,state:valid?(payload.checks.find(p=>p.id===c.id)?.state??'inconclusive'):'not_tested'}));
 const tested=checks.filter(c=>c.state==='passed').length;
 // A staging exercise must never imply that a live bank account or live card
 // payment has been verified. Keep this missing acceptance in the denominator.
 checks.push({title:'Live payment-provider and bank onboarding acceptance',state:'not_tested'});
 const attention=checks.some(c=>c.state==='failed'||c.state==='attention');
 return {audience,context,automatic,phase,event,current:valid,checkedAt:trusted?payload?.finishedAt??null:null,reportHref,
  status:!valid?'unavailable':attention?'attention':checks.some(c=>c.state!=='passed')?'incomplete':'checked',
  payment:{passed:tested,total:checks.length,checks},overall:audience==='principal'&&valid?watchdogScore(payload.checks):null,
  paymentMode:'sandbox',explanation:'Daily and after-release checks exercise named platform controls using fictional records. Card and bank details belong in Stripe-hosted forms, not messages or uploads here. These checks do not certify your bank account, prove that no information has ever leaked, or constitute PCI DSS or ISO certification.'};
}
