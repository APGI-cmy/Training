import 'server-only';
import {createHmac} from 'node:crypto';
import {isIP} from 'node:net';
import {headers} from 'next/headers';
import {adminRest} from '@/server/supabase/admin-rest';

export function securityBucket(label:string){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw Error('SECURITY_BUDGET_UNAVAILABLE');
 return createHmac('sha256',key).update('apgi-security-v1:'+label).digest('hex');
}
export async function claimSecurityBudget(label:string,limit:number,seconds:number,testRun?:string){
 const r=await adminRest('/rest/v1/rpc/v2_security_budget',{method:'POST',body:JSON.stringify({p_bucket:securityBucket(label),p_limit:limit,p_seconds:seconds,p_test_run:testRun??null}),signal:AbortSignal.timeout(5000)});
 if(!r.ok)throw Error('SECURITY_BUDGET_UNAVAILABLE');return await r.json()===true;
}
export async function claimSignInBudget(email:string){
 // Vercel overwrites X-Forwarded-For at the trusted edge. Untrusted/local
 // headers never become a source identity. Raw addresses are never retained.
 if(process.env.VERCEL==='1'){
  const raw=(await headers()).get('x-forwarded-for')?.split(',')[0]?.trim();
  if(raw&&isIP(raw)&&!await claimSecurityBudget('login-ip:'+raw,60,300))return false;
 }
 return claimSecurityBudget('login-account:'+email.trim().toLowerCase(),8,900);
}
