import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('next/headers',()=>({headers:async()=>new Headers({'x-forwarded-for':'192.0.2.1'}),cookies:async()=>({get:()=>undefined})}));
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:vi.fn()}));
import {adminRest} from '@/server/supabase/admin-rest';
import {claimSignInBudget,securityBucket,claimSecurityBudget} from '@/server/security/auth-budget';
import {sessionNeedsMfa} from '@/server/auth/session-assurance';
import {signInWithPassword} from '@/server/auth/session';
const actor='44fef034-d82f-4a78-b169-343a69ba0c1f';
const token=(aal:string)=>'h.'+Buffer.from(JSON.stringify({sub:actor,session_id:actor,aal})).toString('base64url')+'.s';
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','synthetic-secret-long-enough');vi.stubEnv('VERCEL','0');});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('administrator step-up and login abuse limits',()=>{
 it('requires private enrolment for privileged users and AAL2 after enrolment',()=>{expect(sessionNeedsMfa(token('aal1'),actor,{active:true,privileged:true,enrolled:false})).toBe(true);expect(sessionNeedsMfa(token('aal1'),actor,{active:true,privileged:true,enrolled:true})).toBe(true);expect(sessionNeedsMfa(token('aal2'),actor,{active:true,privileged:true,enrolled:true})).toBe(false);expect(sessionNeedsMfa(token('aal1'),actor,{active:true,privileged:false,enrolled:false})).toBe(false);expect(sessionNeedsMfa(token('aal1'),actor,{active:true,privileged:false,enrolled:true})).toBe(true);});
 it('hashes and normalises account keys without retaining raw identity',async()=>{vi.mocked(adminRest).mockImplementation(async()=>Response.json(true));await claimSignInBudget(' Owner@Example.invalid ');const body=JSON.parse(String(vi.mocked(adminRest).mock.calls[0][1]?.body));expect(body).toEqual({p_bucket:securityBucket('login-account:owner@example.invalid'),p_limit:8,p_seconds:900,p_test_run:null});expect(JSON.stringify(body)).not.toContain('owner');});
 it('claims trusted edge IP budget first and stops before allocating account keys if exceeded',async()=>{vi.stubEnv('VERCEL','1');vi.mocked(adminRest).mockResolvedValue(Response.json(false));expect(await claimSignInBudget('owner@example.invalid')).toBe(false);expect(adminRest).toHaveBeenCalledOnce();expect(JSON.parse(String(vi.mocked(adminRest).mock.calls[0][1]?.body)).p_bucket).toBe(securityBucket('login-ip:192.0.2.1'));});
 it('blocks sign-in before authentication or cookie storage when the budget is exceeded',async()=>{vi.mocked(adminRest).mockResolvedValue(Response.json(false));vi.stubGlobal('fetch',vi.fn());expect(await signInWithPassword('owner@example.invalid','synthetic-password')).toMatchObject({ok:false,error:expect.stringMatching(/Too many/)});expect(fetch).not.toHaveBeenCalled();});
 it('fails closed on missing/unavailable budget storage',async()=>{vi.mocked(adminRest).mockResolvedValue(new Response('',{status:503}));await expect(claimSecurityBudget('synthetic',8,900)).rejects.toThrow('SECURITY_BUDGET_UNAVAILABLE');expect(await signInWithPassword('owner@example.invalid','synthetic-password')).toMatchObject({ok:false,error:expect.stringMatching(/temporarily unavailable/)});});
});
