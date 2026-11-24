import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('@/server/security-watchdog/runner',()=>({
 cleanInterruptedWatchdogRuns:vi.fn(),
 runSecurityWatchdog:vi.fn(),
 watchdogDeployment:()=> 'verified-deployment',
 watchdogCommit:()=> 'release-commit',
}));
vi.mock('@/server/security-watchdog/signing',()=>({watchdogPublicKey:vi.fn(),signWatchdogReport:vi.fn(),verifyWatchdogReport:vi.fn()}));
vi.mock('@/server/security-watchdog/store',()=>({watchdogRpc:vi.fn(),watchdogPatch:vi.fn()}));
vi.mock('@/server/security-watchdog/access',()=>({watchdogActorId:()=> 'operator',watchdogRun:vi.fn()}));
vi.mock('@/server/security-watchdog/operations',()=>({queueWatchdogResult:vi.fn(),flushWatchdogAlerts:vi.fn()}));
vi.mock('@/server/security-watchdog/events',()=>({recordSecurityEvent:vi.fn()}));
vi.mock('@/server/services/company-structure',()=>({rows:vi.fn()}));
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:vi.fn()}));
vi.mock('@/server/production-environment',()=>({assertProductionEnvironment:vi.fn(),PRODUCTION_PROJECT_ID:'nks-project'}));
import {GET} from '../app/api/cron/security-watchdog/route';
import {PRODUCTION_WATCHDOG_SUITE} from '@/lib/security-watchdog';
import {assertProductionEnvironment} from '@/server/production-environment';
import {stagingCronSecret} from '@/server/environment-isolation';
import {rows} from '@/server/services/company-structure';
import {adminRest} from '@/server/supabase/admin-rest';
import {watchdogRun} from '@/server/security-watchdog/access';
import {watchdogRpc,watchdogPatch} from '@/server/security-watchdog/store';
import {verifyWatchdogReport} from '@/server/security-watchdog/signing';
import {cleanInterruptedWatchdogRuns,runSecurityWatchdog} from '@/server/security-watchdog/runner';
import {flushWatchdogAlerts} from '@/server/security-watchdog/operations';

const company='ebe89fb6-23fa-4fb1-9bfb-c525795fa3c7';
let scheduledScope:string|null=company;
let unavailableConfig=false;
const request=(secret='fixture-secret')=>new Request('https://example.invalid/api/cron/security-watchdog',{headers:{authorization:'Bearer '+secret}});
beforeEach(()=>{
 vi.resetAllMocks();
 vi.stubEnv('ALP_ENVIRONMENT','training-production');
 vi.stubEnv('ALP_DEFAULT_ORGANISATION_ID',company);
 vi.stubEnv('CRON_SECRET','fixture-secret');
 scheduledScope=company;
 unavailableConfig=false;
 vi.mocked(rows).mockImplementation(async path=>path.includes('platform_deployment_identity')?[{project_id:'nks-project'}]:[{name:'NKS Capital'}] as never);
 vi.mocked(watchdogRpc).mockImplementation(async name=>{
  if(name==='v2_watchdog_monitor_claim')return {actorId:'operator',companyId:scheduledScope,requestId:'scheduled-request',principal:true,reason:'deployment'};
  if(name==='v2_watchdog_start')return {id:'first-run',state:'running',created_at:new Date().toISOString(),deployment:'verified-deployment'};
  if(name==='v2_watchdog_configuration'){
   if(unavailableConfig)throw Error('Unavailable');
   return {allPublicTablesRls:true,clientDestructiveGrantsPresent:false,privateEvidenceBucket:true,watchdogRecordsServerOnly:true};
  }
  if(name==='v2_watchdog_notify')return 1;
  throw Error('Unexpected production database operation '+name);
 });
 vi.mocked(watchdogRun).mockImplementation(async()=>({id:'first-run',...vi.mocked(watchdogPatch).mock.calls[0][1] as object,proof:{}} as never));
 vi.mocked(verifyWatchdogReport).mockReturnValue(true);
 vi.mocked(adminRest).mockResolvedValue(new Response(null,{status:204}));
});
afterEach(()=>vi.unstubAllEnvs());

it('saves signed production configuration evidence and never runs staging fixtures or alerts',async()=>{
 const result=await GET(request());
 expect(result.status).toBe(200);
 expect(await result.json()).toEqual({automaticRun:'first-run'});
 expect(watchdogPatch).toHaveBeenCalledWith('first-run',expect.objectContaining({
  state:'finished',fixtures_cleaned:true,
  payload:expect.objectContaining({suite:PRODUCTION_WATCHDOG_SUITE,environment:'training-production',scope:{companyId:company,label:'NKS Capital'},trigger:'deployment'}),
 }));
 expect(vi.mocked(watchdogRpc).mock.calls.map(([name])=>name)).toEqual(['v2_watchdog_monitor_claim','v2_watchdog_start','v2_watchdog_configuration','v2_watchdog_notify']);
 expect(adminRest).toHaveBeenCalledWith('/rest/v1/v2_watchdog_monitors?scope_key=eq.'+company,expect.objectContaining({method:'PATCH'}));
 for(const routine of [cleanInterruptedWatchdogRuns,runSecurityWatchdog,flushWatchdogAlerts])expect(routine).not.toHaveBeenCalled();
});
it('rejects a missing scheduler credential before inspecting production',async()=>{
 expect((await GET(request('wrong'))).status).toBe(401);
 expect(assertProductionEnvironment).not.toHaveBeenCalled();
 expect(watchdogRpc).not.toHaveBeenCalled();
});
it('reserves the production schedule secret for Watchdog while retaining staging schedules',()=>{
 expect(stagingCronSecret()).toBeUndefined();
 expect(stagingCronSecret({ALP_ENVIRONMENT:'v2-staging',CRON_SECRET:'staging-scheduler'})).toBe('staging-scheduler');
});
it('fails closed before claiming work if production isolation is invalid',async()=>{
 vi.mocked(assertProductionEnvironment).mockImplementation(()=>{throw Error('Production checks disabled');});
 expect((await GET(request())).status).toBe(503);
 expect(watchdogRpc).not.toHaveBeenCalled();
});
it('does not start a production report in a foreign or all-platform scope',async()=>{
 scheduledScope=null;
 expect((await GET(request())).status).toBe(503);
 expect(watchdogRpc).toHaveBeenCalledTimes(1);
 expect(watchdogPatch).not.toHaveBeenCalled();
});
it('records unavailable database checks as inconclusive and retains the last successful completion',async()=>{
 unavailableConfig=true;
 expect((await GET(request())).status).toBe(200);
 expect(watchdogPatch).toHaveBeenCalledWith('first-run',expect.objectContaining({state:'inconclusive'}));
 expect(adminRest).not.toHaveBeenCalled();
});
