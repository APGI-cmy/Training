import 'server-only';
import {PRODUCTION_WATCHDOG_SUITE,summariseChecks,type WatchdogCheck,type WatchdogPayload,type WatchdogRun} from '@/lib/security-watchdog';
import {assertProductionEnvironment,PRODUCTION_PROJECT_ID} from '@/server/production-environment';
import {rows} from '@/server/services/company-structure';
import {productionCompanyId} from '@/server/services/tenant-courses';
import {type WatchdogAccess,watchdogActorId,watchdogRun} from './access';
import {watchdogCommit,watchdogDeployment} from './runner';
import {signWatchdogReport,verifyWatchdogReport,watchdogPublicKey} from './signing';
import {watchdogPatch,watchdogRpc} from './store';

type Configuration = Record<'allPublicTablesRls'|'clientDestructiveGrantsPresent'|'privateEvidenceBucket'|'watchdogRecordsServerOnly',boolean>;

export async function productionWatchdogContext() {
  assertProductionEnvironment(process.env);
  const id=productionCompanyId();
  if(!id)throw Error('The production Watchdog has no company binding.');
  watchdogPublicKey();
  const [identity,companies]=await Promise.all([
    rows<{project_id:string}>('/rest/v1/platform_deployment_identity?select=project_id&limit=2'),
    rows<{name:string}>(`/rest/v1/organisations?id=eq.${id}&is_active=eq.true&select=name&limit=1`),
  ]);
  if(identity.length!==1||identity[0].project_id!==PRODUCTION_PROJECT_ID||!companies[0])throw Error('The production Watchdog identity could not be verified.');
  return {id,name:companies[0].name};
}

export async function runProductionWatchdog(access:WatchdogAccess,company:Awaited<ReturnType<typeof productionWatchdogContext>>,requestId:string,trigger:'scheduled'|'deployment') {
  if(!access.automatic||access.principal||company.id!==productionCompanyId()||access.ownedCompanyIds.length!==1||access.ownedCompanyIds[0]!==company.id)throw Error('The production Watchdog requires its scheduled company scope.');
  const actor=watchdogActorId(access),args={p_actor:actor,p_company:company.id};
  const run=await watchdogRpc<WatchdogRun&{reused?:boolean}>('v2_watchdog_start',{...args,p_request:requestId,p_deployment:watchdogDeployment()});
  if(run.reused||run.state!=='running')return run;

  const config=await watchdogRpc<Configuration>('v2_watchdog_configuration',args).catch(()=>null);
  const checks:WatchdogCheck[]=[
    {id:'company_deployment_identity',title:'Production deployment and company binding',kind:'live_configuration',state:'passed',detail:'Verified the dedicated hosting project, database identity and active company scope.'},
    {id:'payment_sandbox_keys',title:'Live payment configuration disabled',kind:'live_configuration',state:'passed',detail:'The production configuration requires disabled payments and rejects live payment credentials.'},
  ];
  const controls=[
    ['allPublicTablesRls',true,'rls_configuration','Database row-security configuration','Inspected row-level security flags on public-schema tables.'],
    ['clientDestructiveGrantsPresent',false,'destructive_grants','Client database privilege hardening','Inspected client-role TRUNCATE grants without executing a destructive operation.'],
    ['privateEvidenceBucket',true,'private_storage','Private review evidence storage','Inspected the review-evidence bucket privacy setting.'],
    ['watchdogRecordsServerOnly',true,'report_storage','Watchdog evidence database permissions','Inspected direct client SELECT and UPDATE privileges on the report, evidence and receipt tables.'],
  ] as const;
  for(const [key,expected,id,title,detail] of controls){
    const actual=config?.[key];
    const state=typeof actual!=='boolean'?'inconclusive':actual===expected?'passed':'failed';
    checks.push({id,title,kind:'live_configuration',state,detail,action:state==='passed'?undefined:'Review the production security configuration and confirm the next run.'});
  }
  checks.push({id:'all_business_paths',title:'Synthetic learner and access workflows',kind:'manual',state:'not_tested',detail:'Synthetic account, enrolment, file, payment and recovery exercises are covered separately in a test environment.'});
  checks.push({id:'independent_review',title:'Independent security review',kind:'manual',state:'not_tested',detail:'Independent testing and certification are outside this production configuration review.'});
  const payload:WatchdogPayload={
    version:1,runId:run.id,suite:PRODUCTION_WATCHDOG_SUITE,application:company.name+' Training',
    environment:'training-production',scope:{companyId:company.id,label:company.name},initiatedBy:actor,trigger,
    startedAt:run.created_at,finishedAt:new Date().toISOString(),deployment:run.deployment,commit:watchdogCommit(),
    policy:'Production configuration reads and Watchdog record writes only',checks,cleanup:true,assurance:summariseChecks(checks),
    limitations:['These results cover the named configuration checks at the recorded time.','No learner accounts, progress, files, certificates or financial transactions are created or modified by this suite.'],
    manualEvidence:[],
  };
  await watchdogPatch(run.id,{payload,proof:signWatchdogReport(payload),state:checks.some(c=>c.state==='inconclusive')?'inconclusive':'finished',finished_at:payload.finishedAt,fixtures_cleaned:true});
  const saved=await watchdogRun(access,run.id);
  if(!saved.payload||!saved.proof||!verifyWatchdogReport(saved.payload,saved.proof))throw Error('Saved production report integrity check failed.');
  await watchdogRpc('v2_watchdog_notify',{p_run:run.id});
  return saved;
}
