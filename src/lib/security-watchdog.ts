export const WATCHDOG_SUITE = 'apgi-watchdog-v6';
export type CheckState = 'passed'|'failed'|'attention'|'inconclusive'|'not_tested';
export type WatchdogCheck = {id:string;title:string;state:CheckState;kind:'live_configuration'|'synthetic_behaviour'|'alarm_drill'|'manual';detail:string;action?:string};
export type WatchdogPayload = {
 version:1;runId:string;suite:string;application:string;environment:'v2-staging';
 scope:{companyId:string|null;label:string};initiatedBy:string;startedAt:string;finishedAt:string;
 deployment:string;commit:string;policy:'Existing deployed database policies and server company guard; synthetic fixtures only';
 trigger?:'manual'|'scheduled'|'deployment';
 checks:WatchdogCheck[];cleanup:boolean;assurance:'needs_attention'|'partial'|'checked';
 limitations:string[];manualEvidence:{controlId:string;disposition:string;reference:string;recordedAt:string;expiresAt:string}[];
};
export type WatchdogProof={algorithm:'Ed25519';digest:string;keyId:string;publicKey:string;signature:string};
export type WatchdogRun={id:string;company_id:string|null;actor_id:string;state:'running'|'finished'|'inconclusive'|'cleanup_pending';created_at:string;finished_at:string|null;deployment:string;payload:WatchdogPayload|null;proof:WatchdogProof|null;fixtures_cleaned:boolean};
export const manualControls=[
 {id:'scope_risks',title:'Scope, information assets and risk treatment'},
 {id:'access_review',title:'User access, MFA and privileged-account review'},
 {id:'suppliers_ai',title:'Suppliers, outbound information and AI integrations'},
 {id:'recovery',title:'Backup restoration and continuity exercise'},
 {id:'policies_training',title:'Approved policies and staff training'},
 {id:'incident_response',title:'Incident response and external alert exercise'},
 {id:'independent_audit',title:'Independent security review and management review'},
] as const;
export function permittedWatchdogScope(principal:boolean,ownedCompanyIds:string[],scope:string|null){
 return scope===null?principal:principal||ownedCompanyIds.includes(scope);
}
export function summariseChecks(checks:WatchdogCheck[]):WatchdogPayload['assurance']{
 if(checks.some(c=>c.state==='failed'||c.state==='attention'))return 'needs_attention';
 return checks.some(c=>c.state==='not_tested'||c.state==='inconclusive')?'partial':'checked';
}
export function reportFreshness(run:Pick<WatchdogRun,'created_at'|'deployment'|'state'>,deployment:string,now=Date.now()){
 return run.state==='running'?'running':run.deployment!==deployment||now-Date.parse(run.created_at)>86400000?'stale':'current';
}
export function stateLabel(state:CheckState){return ({passed:'Passed',failed:'Failed',attention:'Needs attention',inconclusive:'Inconclusive',not_tested:'Not tested'})[state];}
export function canonicalJson(value:unknown):string{
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';
 return '{'+Object.entries(value as Record<string,unknown>).filter(([,v])=>v!==undefined).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>JSON.stringify(k)+':'+canonicalJson(v)).join(',')+'}';
}
