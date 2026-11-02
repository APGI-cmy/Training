import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
vi.mock('@/server/security-watchdog/hardening-probes',()=>({prepareFixtureMfa:vi.fn(),hardeningProbes:vi.fn(),hardeningCheckNames:[]}));
vi.mock('@/server/environment-isolation',()=>({assertStagingIsolation:vi.fn(),STAGING_DATABASE_REF:'test-v2-only'}));
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:vi.fn()}));
vi.mock('@/server/services/company-structure',()=>({rows:vi.fn(),requireCompanyForSession:vi.fn()}));
vi.mock('@/server/security-watchdog/access',async importOriginal=>{const actual=await importOriginal<typeof import('@/server/security-watchdog/access')>();return {...actual,watchdogAccess:vi.fn(),watchdogRun:vi.fn()};});
vi.mock('@/server/auth/session',()=>({getCurrentSession:vi.fn(),getUserRoles:vi.fn()}));
vi.mock('@/server/services/platform-principals',()=>({isPlatformPrincipal:vi.fn()}));
vi.mock('@/server/security-watchdog/store',()=>({watchdogRpc:vi.fn(),watchdogPatch:vi.fn(),watchdogEvidence:vi.fn(),watchdogDashboard:vi.fn()}));
vi.mock('@/server/security-watchdog/signing',()=>({watchdogPublicKey:vi.fn(),signWatchdogReport:vi.fn(),verifyWatchdogReport:()=>true}));
vi.mock('@/server/security-watchdog/additional-probes',async original=>{const actual=await original<typeof import('@/server/security-watchdog/additional-probes')>();return {...actual,additionalProbes:vi.fn(async()=>{})};});
vi.mock('@/server/security-watchdog/http-probes',async original=>{const actual=await original<typeof import('@/server/security-watchdog/http-probes')>();return {...actual,httpProbes:vi.fn(async()=>{})};});
import {adminRest} from '@/server/supabase/admin-rest';
import {rows,requireCompanyForSession} from '@/server/services/company-structure';
import {watchdogAccess,watchdogRun,WatchdogError,watchdogActorId} from '@/server/security-watchdog/access';
import {watchdogRpc,watchdogPatch,watchdogEvidence,watchdogDashboard} from '@/server/security-watchdog/store';
import {runSecurityWatchdog} from '@/server/security-watchdog/runner';
import type {WatchdogPayload} from '@/lib/security-watchdog';
const runId='ad673bd3-ff61-46b6-9941-090675220964';
const actor={session:{accessToken:'operator-token',user:{id:'operator',email_confirmed_at:'yes'}},principal:true,ownedCompanyIds:[]};
let fixtureCompanies:string[],profilePositive:boolean,providerFailure:boolean,cleanupFailure:boolean,patches:Record<string,unknown>[];
beforeEach(()=>{
 vi.resetAllMocks();fixtureCompanies=[];profilePositive=true;providerFailure=false;cleanupFailure=false;patches=[];
 vi.mocked(rows).mockResolvedValue([]);
 vi.mocked(watchdogEvidence).mockResolvedValue([]);
 vi.mocked(watchdogPatch).mockImplementation(async(_id,p)=>{patches.push(p as Record<string,unknown>);});
 vi.mocked(watchdogRpc).mockImplementation(async(name,body)=>{
  if(name==='v2_watchdog_start')return {id:runId,resources:{},state:'running',created_at:new Date().toISOString(),deployment:'dpl_qa'} as never;
  if(name==='v2_watchdog_configuration')return {allPublicTablesRls:true,clientDestructiveGrantsPresent:false,watchdogRecordsServerOnly:true,privateEvidenceBucket:true} as never;
  if(name==='v2_watchdog_seed'){fixtureCompanies=(body as {p_companies:string[]}).p_companies;return undefined as never;}
  if(name==='v2_watchdog_clean_fixtures'){if(cleanupFailure)throw Error('cleanup unavailable');return {userIds:['fixture-1','fixture-2','fixture-3']} as never;}
  if(name==='v2_watchdog_allowed')return true as never;
  return 1 as never;
 });
 vi.mocked(adminRest).mockImplementation(async(path,init)=>{
  if(path==='/auth/v1/admin/users'){
   if(providerFailure)return Response.json({},{status:503});
   const b=JSON.parse(String(init?.body));const index=b.email.match(/-([123])@/)[1];return Response.json({id:'fixture-'+index,app_metadata:b.app_metadata});
  }
  return Response.json({});
 });
 vi.mocked(requireCompanyForSession).mockImplementation(async(id)=>{if(id===fixtureCompanies[0])return {company:{id}} as never;throw Error('You do not have access to this company.');});
 vi.mocked(watchdogAccess).mockImplementation(async(s)=>{if(s?.user.id==='fixture-3')throw new WatchdogError('No administrator scope');return {session:s!,principal:false,ownedCompanyIds:[fixtureCompanies[0]]};});
 vi.mocked(watchdogRun).mockImplementation(async(access)=>{if(watchdogActorId(access)!=='operator')throw new WatchdogError('Unavailable',404);return {payload:patches.find(p=>p.payload)?.payload,proof:{}} as never;});
 vi.mocked(watchdogDashboard).mockResolvedValue({runs:[],deliveries:[{id:'delivery',run_id:runId,created_at:'now',read_at:null}],evidence:[]});
 vi.stubGlobal('fetch',vi.fn(async(input:string,init?:RequestInit)=>{
  const url=new URL(input),token=new Headers(init?.headers).get('authorization')?.replace('Bearer ','');
  if(url.pathname==='/auth/v1/token'){const body=JSON.parse(String(init?.body)),index=body.email.match(/-([123])@/)[1];return Response.json({access_token:'fixture-'+index,user:{id:'fixture-'+index}});}
  if(url.pathname==='/auth/v1/user')return Response.json({id:token,email:'synthetic@example.invalid',email_confirmed_at:'yes',app_metadata:{watchdog_run:runId}});
  if(url.pathname==='/auth/v1/logout')return Response.json({});
  if(url.pathname.endsWith('/profiles'))return Response.json(profilePositive&&url.searchParams.get('user_id')==='eq.fixture-1'?[{user_id:'fixture-1'}]:[]);
  if(url.pathname.endsWith('/organisation_memberships'))return Response.json(url.searchParams.get('user_id')==='eq.fixture-1'?[{user_id:'fixture-1'}]:[]);
  if(url.pathname.endsWith('/v2_watchdog_runs'))return Response.json({},{status:403});
  if(url.pathname.endsWith('/v2_watchdog_canaries'))return token?Response.json(url.searchParams.get('owner_id')==='eq.fixture-1'?[{id:'marker',marker:'WATCHDOG-SYNTHETIC-OWN'}]:[]):Response.json({},{status:403});
  throw Error('Unexpected test request');
 }));
});
afterEach(()=>vi.unstubAllGlobals());
const saved=()=>patches.find(p=>p.payload)?.payload as WatchdogPayload;
describe('Watchdog controlled-run failure behavior',()=>{
 it('finishes adapter orchestration and strips credentials from evidence',async()=>{await runSecurityWatchdog(actor,null,runId);const p=saved();for(const control of ['own_profile','foreign_profile','foreign_company','peer_canary','foreign_canary','watchdog_report','alarm','cleanup'])expect(p.checks.find(c=>c.id===control)?.state).toBe('passed');expect(p.assurance).toBe('partial');expect(p.checks.some(c=>c.state==='not_tested')).toBe(true);expect(p.cleanup).toBe(true);expect(JSON.stringify(p)).not.toMatch(/fixture-1|operator-token|"access_token":|"password":/);expect(watchdogRpc).toHaveBeenCalledWith('v2_watchdog_clean_fixtures',{p_run:runId});});
 it('does not call denied profile probes when the positive control fails',async()=>{profilePositive=false;await runSecurityWatchdog(actor,null,runId);expect(saved().checks.find(c=>c.id==='own_profile')?.state).toBe('failed');expect(saved().checks.find(c=>c.id==='profile_negatives')?.state).toBe('inconclusive');expect(saved().checks.find(c=>c.id==='foreign_profile')?.state).toBe('inconclusive');expect(saved().cleanup).toBe(true);});
 it('cleans and retains an inconclusive report when identity provisioning fails',async()=>{providerFailure=true;await runSecurityWatchdog(actor,null,runId);expect(saved().checks.find(c=>c.id==='runner')?.state).toBe('inconclusive');expect(saved().cleanup).toBe(true);expect(patches.find(p=>p.payload)?.state).toBe('inconclusive');});
 it('marks failed cleanup for the scheduled retry rather than claiming success',async()=>{cleanupFailure=true;await runSecurityWatchdog(actor,null,runId);expect(saved().cleanup).toBe(false);expect(saved().checks.find(c=>c.id==='cleanup')?.state).toBe('failed');expect(patches.find(p=>p.payload)?.state).toBe('cleanup_pending');});
 it('refuses to provision a second fixture set for an in-flight idempotency key',async()=>{vi.mocked(watchdogRpc).mockImplementation(async(name)=>name==='v2_watchdog_start'?{id:runId,state:'running',resources:{},reused:true} as never:[] as never);await expect(runSecurityWatchdog(actor,null,runId)).rejects.toMatchObject({status:409});expect(adminRest).not.toHaveBeenCalled();});
});
