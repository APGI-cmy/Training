import type {WatchdogCheck,WatchdogPayload} from './security-watchdog';
export function watchdogScore(checks:WatchdogCheck[]){
 const total=checks.length,passed=checks.filter(c=>c.state==='passed').length;
 const findings=checks.filter(c=>c.state==='failed'||c.state==='attention').length;
 const gaps=total-passed-findings;
 return {total,passed,findings,gaps,percent:total?Math.floor(100*passed/total):0,coverage:total?Math.floor(100*(passed+findings)/total):0};
}
export const watchdogDomains=[
 {id:'access',title:'People and company separation',matches:['profile','company','membership','canary','watchdog_scope','watchdog_report','viewer_only','business','asset_','download_','export_','http_report','http_scorm','http_origin']},
 {id:'configuration',title:'Database and private information',matches:['rls_','destructive','private_storage','report_storage','raw_reports','storage','views','functions','data_api']},
 {id:'identity',title:'Account protection',matches:['mfa','session','password','identity']},
 {id:'network',title:'Network and outbound protection',matches:['edge_','outbound']},
 {id:'operations',title:'Monitoring, alerts and recovery',matches:['alarm','cleanup','runner','restore','outbound','monitor','email','recovery','integrity']},
 {id:'independent',title:'Independent security review and full coverage',matches:['independent','all_business_paths','governance']},
] as const;
export function watchdogDomain(check:WatchdogCheck){return watchdogDomains.find(d=>d.matches.some(m=>check.id.includes(m)))?.id??'operations';}
export const watchdogActions=[
 {id:'database_permissions',title:'Database hardening',description:'Remove unnecessary client privileges and retain regression evidence.',owner:'APGI administrators'},
 {id:'business_isolation',title:'Complete information-access testing',description:'Extend real route, file, export, cache and job tests across every role and company.',owner:'APGI development'},
 {id:'identity',title:'Administrator account protection',description:'Enrol administrator MFA, verify provider password controls and test access revocation.',owner:'Account owners / APGI'},
 {id:'monitoring',title:'Monitoring and alert response',description:'Confirm scheduled probes, instrumented security events, external delivery and incident escalation.',owner:'APGI administrators'},
 {id:'outbound',title:'Outbound information and suppliers',description:'Review email recipients, authorised external services, AI data handling and outbound restrictions.',owner:'APGI administrators'},
 {id:'recovery',title:'Backup restoration exercise',description:'Restore an approved backup into a separate recovery environment, verify it and record recovery time.',owner:'APGI operations'},
 {id:'independent_audit',title:'Independent security review',description:'Arrange an independent security review and penetration test; retain findings and retest evidence. Course quality review and learner competency decisions remain separate.',owner:'Independent security reviewer'},
 {id:'governance',title:'Policies, people and ISO evidence',description:'Approve risks, responsibilities, supplier reviews, training and incident procedures; independent certification is separate.',owner:'APGI management'},
 {id:'production',title:'Production and integration verification',description:'Repeat checks against the approved production environment and its enabled integrations before release.',owner:'APGI release owner'},
 {id:'evidence_integrity',title:'Trusted evidence and key lifecycle',description:'Retain trusted verification keys, protect signing secrets and arrange independent log retention.',owner:'APGI operations'},
] as const;
export type WatchdogActionRow={id:string;company_id:string|null;control_id:string;owner_label:string;state:'open'|'in_progress'|'evidence_ready';due_at:string|null;note:string;updated_at:string};
export type WatchdogMonitor={enabled:boolean;last_attempt_at:string|null;last_run_at:string|null;last_deployment:string|null;last_run_id:string|null};
export type WatchdogAlert={id:string;run_id:string|null;kind:string;severity:string;state:string;created_at:string;read_at:string|null;sent_at:string|null};
export function expectedWatchdogChecks(checks:WatchdogCheck[],expected:{id:string;title:string}[]){
 const found=new Set(checks.map(c=>c.id));
 return [...checks,...expected.filter(c=>!found.has(c.id)).map(c=>({...c,kind:'synthetic_behaviour' as const,state:'inconclusive' as const,detail:'This named check was not completed. It has not been counted as a pass.',action:'Resolve the interrupted test and run a fresh check.'}))];
}
export function scopedTrend(runs:{id:string;company_id:string|null;payload:WatchdogPayload|null}[],scope:string|null,suite:string){
 return runs.filter(r=>r.company_id===scope&&r.payload?.suite===suite).slice(0,8).reverse().map(r=>({id:r.id,date:r.payload!.finishedAt,...watchdogScore(r.payload!.checks)}));
}
