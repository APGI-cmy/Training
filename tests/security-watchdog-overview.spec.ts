import {describe,it,expect,vi,afterEach} from 'vitest';
import {generateKeyPairSync} from 'node:crypto';
import {watchdogScore,expectedWatchdogChecks,scopedTrend} from '@/lib/watchdog-overview';
import {verifiedSessionClaims,requiresAccountMfa,activeVerifiedSession} from '@/server/auth/session-assurance';
import {signWatchdogReport,verifyWatchdogReport} from '@/server/security-watchdog/signing';
import type {WatchdogCheck,WatchdogPayload} from '@/lib/security-watchdog';
import {syntheticTotp} from '@/server/security-watchdog/synthetic-totp';
vi.mock('@/server/environment-isolation',()=>({assertStagingIsolation:vi.fn(),STAGING_DATABASE_REF:'v2-test'}));
const c=(state:WatchdogCheck['state']):WatchdogCheck=>({id:state,title:state,state,kind:'synthetic_behaviour',detail:'Synthetic QA'});
const session='ad673bd3-ff61-46b6-9941-090675220964';
const token=(v:unknown)=>'header.'+Buffer.from(JSON.stringify(v)).toString('base64url')+'.already-provider-verified';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('Truthful visual scoring and scoped history',()=>{
 it('includes all gaps in the denominator and never invents 100% for no evidence',()=>{
  expect(watchdogScore([]).percent).toBe(0);
  expect(watchdogScore([c('passed'),c('passed'),c('failed'),c('inconclusive'),c('not_tested')])).toEqual({total:5,passed:2,findings:1,gaps:2,percent:40,coverage:60});
 });
 it('makes omitted checks inconclusive after an interrupted run',()=>{
  const checks=expectedWatchdogChecks([c('passed')],[{id:'passed',title:'Positive'},{id:'missing',title:'Unfinished'}]);
  expect(checks[1].state).toBe('inconclusive');expect(watchdogScore(checks).percent).toBe(50);
 });
 it('never mixes company scopes or suite editions in trend percentages',()=>{
  const p=(suite:string)=>({suite,finishedAt:'2026-11-02',checks:[c('passed')]} as WatchdogPayload);
  expect(scopedTrend([{id:'own',company_id:'a',payload:p('v2')},{id:'foreign',company_id:'b',payload:p('v2')},{id:'old',company_id:'a',payload:p('v1')}],'a','v2').map(x=>x.id)).toEqual(['own']);
 });
});
describe('Verified-session and MFA boundary',()=>{
 it('matches the RFC 6238 SHA1 test vector using six digits',()=>{expect(syntheticTotp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',59000)).toBe('287082');expect(()=>syntheticTotp('invalid!')).toThrow();});
 it('rejects missing or mismatched session identity',()=>{
  expect(verifiedSessionClaims('bad','a')).toBeNull();expect(verifiedSessionClaims(token({sub:'b',session_id:session}),'a')).toBeNull();
  expect(verifiedSessionClaims(token({sub:'a',session_id:'-'.repeat(36)}),'a')).toBeNull();
 });
 it('requires AAL2 for an enrolled TOTP account but permits its private challenge',()=>{
  const factors=[{id:session,status:'verified',factor_type:'totp'}];
  expect(requiresAccountMfa(token({sub:'a',session_id:session,aal:'aal1'}),'a',factors)).toBe(true);
  expect(requiresAccountMfa(token({sub:'a',session_id:session,aal:'aal2'}),'a',factors)).toBe(false);
  expect(requiresAccountMfa(token({sub:'a',session_id:session}),'a',[{...factors[0],status:'unverified'}])).toBe(false);
 });
 it('fails closed when the trusted session was revoked or its check is unavailable',async()=>{
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','synthetic-key');const t=token({sub:'a',session_id:session});
  const f=vi.fn().mockResolvedValueOnce(Response.json(false)).mockResolvedValueOnce(Response.json(true)).mockRejectedValueOnce(Error('unavailable'));vi.stubGlobal('fetch',f);
  expect(await activeVerifiedSession(t,'a')).toBe(false);expect(await activeVerifiedSession(t,'a')).toBe(true);expect(await activeVerifiedSession(t,'a')).toBe(false);
  expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({p_actor:'a',p_session:session});
 });
});
describe('Report verification after approved key rotation',()=>{
 it('retains only separately approved old public keys',()=>{
  const key=()=>generateKeyPairSync('ed25519').privateKey.export({format:'der',type:'pkcs8'}).toString('base64');
  vi.stubEnv('SECURITY_WATCHDOG_SIGNING_KEY',key());const payload={checks:[c('passed')]} as WatchdogPayload,proof=signWatchdogReport(payload);
  vi.stubEnv('SECURITY_WATCHDOG_SIGNING_KEY',key());expect(verifyWatchdogReport(payload,proof)).toBe(false);
  vi.stubEnv('SECURITY_WATCHDOG_VERIFICATION_KEYS',JSON.stringify([proof.publicKey]));expect(verifyWatchdogReport(payload,proof)).toBe(true);
  expect(verifyWatchdogReport({...payload,cleanup:false},proof)).toBe(false);
 });
});
