// Explicit, isolated provider QA. Never included in the normal release suite.
import {beforeAll,describe,it,expect,vi} from 'vitest';
import nextEnv from '@next/env';
import {createHash,randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
const fixture=vi.hoisted(()=>({setup:false,delivery:null as null|{token:string;recipientEmail:string;accountSetup?:boolean},cookies:new Map<string,{value:string}>(),confirmed:null as null|{access_token:string;user:{id:string;email:string}},signOut:vi.fn()}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw Error(`REDIRECT:${url}`);}}));
vi.mock('next/headers',()=>({cookies:async()=>({get:(key:string)=>fixture.cookies.get(key),set:(key:string,value:string)=>fixture.cookies.set(key,{value}),delete:(key:string)=>fixture.cookies.delete(key)})}));
vi.mock('@/server/auth/session',async original=>({...await original<object>(),storeVerifiedSession:async(value:typeof fixture.confirmed)=>{fixture.confirmed=value;},signOut:fixture.signOut}));
vi.mock('@/server/environment-isolation',async original=>{const actual=await original<typeof import('@/server/environment-isolation')>();return {...actual,usesStagingMailCapture:()=>fixture.setup?false:actual.usesStagingMailCapture()};});
// Intercept only fixture setup delivery. No real email is accepted or recorded.
vi.mock('@/server/services/invitations/deliver-stored-invitation',()=>({deliverStoredInvitation:async(input:NonNullable<typeof fixture.delivery>)=>{fixture.delivery=input;return {ok:true,deliveryStatus:'staging_link'};}}));
import {assertStagingIsolation,STAGING_DATABASE_REF} from '@/server/environment-isolation';
import {adminRest} from '@/server/supabase/admin-rest';
import {registerInvitedUser} from '@/server/actions/auth/register-invited-user';
import {confirmAccount} from '@/server/actions/auth/confirm-account';
import {requestPasswordRecovery,beginPasswordReset,updateRecoveredPassword} from '@/server/actions/auth/password-recovery';
beforeAll(()=>{
 const mode=process.env.NODE_ENV;vi.stubEnv('NODE_ENV','development');nextEnv.loadEnvConfig(process.cwd(),true);vi.stubEnv('NODE_ENV',mode);vi.stubEnv('ALP_EMAIL_MODE','disabled');assertStagingIsolation();
 expect(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname).toBe(`${STAGING_DATABASE_REF}.supabase.co`);
});
function form(values:Record<string,string>){const data=new FormData();for(const [key,value]of Object.entries(values))data.set(key,value);return data;}
async function request(path:string,body?:unknown,method='POST'){
 const response=await adminRest(path,body?{method,headers:{Prefer:'return=representation'},body:JSON.stringify(body)}:{});
 if(!response.ok)throw Error(`Fixture operation failed (${response.status})`);
 const text=await response.text();return text?JSON.parse(text):null;
}
async function authLogin(email:string,password:string){return fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,'content-type':'application/json'},body:JSON.stringify({email,password})});}
describe('Real V2 signup-to-recovery provider flow without external mail',()=>{
 it('routes a missing invited account to setup, verifies its email, resets its password, and signs in with the new password',async()=>{
  const email=`qa-v2-recovery-${randomBytes(8).toString('hex')}@example.invalid`,password=randomBytes(32).toString('base64url'),replacement=randomBytes(32).toString('base64url'),token=randomBytes(32).toString('base64url');
  let invitation='',user='';
  const checks:Record<string,boolean>={};
  try{
   const [org]=await request('/rest/v1/organisations?slug=eq.apgi&select=id');
   const actor='fdb1e4d5-0ca4-44fa-bbbb-197a225181e4';
   const [created]=await request('/rest/v1/course_invitations',{recipient_email:email,course_id:'vpshr-level-0',organisation_id:org.id,invited_role:'learner',basis:'internal_allocation',reason:'Disposable password recovery regression QA',expires_at:new Date(Date.now()+3600000).toISOString(),token_hash:createHash('sha256').update(token).digest('hex'),created_by:actor});invitation=created.id;
   fixture.setup=true;
   expect((await requestPasswordRecovery({},form({email}))).error).toBeUndefined();
   expect(fixture.delivery).toMatchObject({recipientEmail:email,accountSetup:true});checks.missingAccountRoutesToSetup=true;
   fixture.setup=false;
   const registered=await registerInvitedUser({},form({email,token:fixture.delivery!.token,password,confirmation:password}));expect(registered.ok).toBe(true);
   const [confirmation]=await request(`/rest/v1/staging_auth_messages?recipient_email=eq.${email}&purpose=eq.confirmation&select=action_url`);
   await expect(confirmAccount(form({token_hash:new URL(confirmation.action_url).searchParams.get('token_hash')!}))).rejects.toThrow('REDIRECT:/profile?onboarding=required');
   user=fixture.confirmed!.user.id;expect(fixture.confirmed!.user.email).toBe(email);checks.emailConfirmedBeforeProfile=true;
   const roles=await request(`/rest/v1/user_roles?user_id=eq.${user}&select=role`);expect(roles.some((row:{role:string})=>row.role==='admin')).toBe(false);checks.noAdministratorGrant=true;
   expect((await requestPasswordRecovery({},form({email,next:'/course-reviews/fixture'}))).error).toBeUndefined();
   const [recovery]=await request(`/rest/v1/staging_auth_messages?recipient_email=eq.${email}&purpose=eq.recovery&select=action_url`);const recoveryToken=new URL(recovery.action_url).searchParams.get('token_hash')!;
   await expect(beginPasswordReset(form({token_hash:recoveryToken,next:'/course-reviews/fixture'}))).rejects.toThrow('REDIRECT:/reset-password');expect(fixture.cookies.has('alp_recovery_token')).toBe(true);checks.recoveryLinkVerified=true;
   await expect(updateRecoveredPassword({},form({password:replacement,confirmation:replacement}))).rejects.toThrow('REDIRECT:/alp-sign-in?passwordReset=success');expect(fixture.cookies.has('alp_recovery_token')).toBe(false);checks.passwordUpdatedAndSessionCleared=true;
   expect((await authLogin(email,replacement)).ok).toBe(true);expect((await authLogin(email,password)).ok).toBe(false);checks.newPasswordWorksOldPasswordRejected=true;
   await expect(beginPasswordReset(form({token_hash:recoveryToken}))).rejects.toThrow('invalid_link');expect(fixture.cookies.has('alp_recovery_token')).toBe(false);checks.reusedLinkRejected=true;
   await mkdir('C:/Users/Johan/Codex-Work/password-recovery-20261025',{recursive:true});await writeFile('C:/Users/Johan/Codex-Work/password-recovery-20261025/provider-qa.json',JSON.stringify({environment:'V2',externalEmailsSent:0,realUserAccountsChanged:0,checks},null,2));
  }finally{
   fixture.setup=false;
   // Only IDs from this generated .invalid fixture may be cleaned up.
   if(!user){const lookup=await request('/auth/v1/admin/users?page=1&per_page=1000');user=lookup.users?.find((entry:{email:string})=>entry.email===email)?.id??'';}
   if(user){const removed=await adminRest(`/auth/v1/admin/users/${user}`,{method:'DELETE',body:JSON.stringify({should_soft_delete:true})});expect(removed.ok).toBe(true);}
   if(invitation){const removed=await adminRest(`/rest/v1/course_invitations?id=eq.${invitation}&recipient_email=eq.${email}`,{method:'PATCH',body:JSON.stringify({status:'revoked',revoked_at:new Date().toISOString()})});expect(removed.ok).toBe(true);}
   const removedMessages=await adminRest(`/rest/v1/staging_auth_messages?recipient_email=eq.${email}`,{method:'DELETE'});expect(removedMessages.ok).toBe(true);
  }
 });
});
