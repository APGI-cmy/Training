import {providerFetch as fetch} from '@/server/security/provider-fetch';
import 'server-only';
import {assertStagingIsolation,STAGING_DATABASE_REF} from '@/server/environment-isolation';
export type AccountFactor={id:string;factor_type:string;status:string;friendly_name?:string};
// Claims are inspected only AFTER /auth/v1/user has verified the access token.
export function verifiedSessionClaims(token:string,actor:string){
 try{const value=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
  return value.sub===actor&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value.session_id??'')?{sessionId:String(value.session_id),aal:String(value.aal??'aal1')}:null;
 }catch{return null;}
}
export function requiresAccountMfa(token:string,actor:string,factors:AccountFactor[]=[]){
 return factors.some(f=>f.status==='verified'&&f.factor_type==='totp')&&verifiedSessionClaims(token,actor)?.aal!=='aal2';
}
export async function activeVerifiedSession(token:string,actor:string){
 assertStagingIsolation();const claims=verifiedSessionClaims(token,actor),key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!claims||!key)return false;
 try{const r=await fetch(`https://${STAGING_DATABASE_REF}.supabase.co/rest/v1/rpc/v2_watchdog_session_active`,{method:'POST',headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({p_actor:actor,p_session:claims.sessionId}),cache:'no-store',signal:AbortSignal.timeout(8000)});return r.ok&&(await r.json())===true;}catch{return false;}
}
export type SessionSecurity={active:boolean;privileged:boolean;enrolled:boolean};
export async function verifiedSessionSecurity(token:string,actor:string):Promise<SessionSecurity>{
 const denied={active:false,privileged:true,enrolled:false};
 assertStagingIsolation();const claims=verifiedSessionClaims(token,actor),key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!claims||!key)return denied;
 try{
  const r=await fetch(`https://${STAGING_DATABASE_REF}.supabase.co/rest/v1/rpc/v2_security_session_status`,{method:'POST',headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({p_actor:actor,p_session:claims.sessionId}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!r.ok)return denied;const value=await r.json();
  return value&&['active','privileged','enrolled'].every(k=>typeof value[k]==='boolean')?value:denied;
 }catch{return denied;}
}
export function sessionNeedsMfa(token:string,actor:string,security:SessionSecurity){
 return (security.privileged||security.enrolled)&&(!security.enrolled||verifiedSessionClaims(token,actor)?.aal!=='aal2');
}
