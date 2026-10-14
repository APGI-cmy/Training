import "server-only";
import { adminRest } from "@/server/supabase/admin-rest";
import { STAGING_ORIGIN } from "@/server/environment-isolation";
export async function captureStagingAuthEmail(email:string,tokenHash:string,purpose:'confirmation'|'recovery',next?:string){
  if(process.env.ALP_ENVIRONMENT!=='v2-staging')throw new Error('Message capture is staging-only.');
  const url=new URL(purpose==='confirmation'?'/confirm-account':'/reset-password',STAGING_ORIGIN);
  url.searchParams.set('token_hash',tokenHash);if(next)url.searchParams.set('next',next);
  const r=await adminRest('/rest/v1/staging_auth_messages',{method:'POST',body:JSON.stringify({recipient_email:email,purpose,action_url:url.toString()})});
  return r.ok;
}
