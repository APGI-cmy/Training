import 'server-only';
import {getCurrentSession,storeVerifiedSession,type AlpSession} from '@/server/auth/session';
import {requiresAccountMfa,type AccountFactor} from '@/server/auth/session-assurance';
import {assertStagingIsolation,STAGING_DATABASE_REF} from '@/server/environment-isolation';
import {WatchdogError,watchdogId} from './access';
async function accountRequest(session:AlpSession,path:string,body?:unknown){
 assertStagingIsolation();return fetch(`https://${STAGING_DATABASE_REF}.supabase.co/auth/v1/${path}`,{method:body===undefined?'GET':'POST',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,authorization:`Bearer ${session.accessToken}`,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(10000)});
}
export async function securityAccount(){
 const session=await getCurrentSession({allowMfaChallenge:true});
 if(!session?.user.email_confirmed_at)throw new WatchdogError('Sign in with your verified account first.',401);
 const r=await accountRequest(session,'user');if(!r.ok)throw new WatchdogError('Account verification is unavailable.',503);
 const user=await r.json();if(user.id!==session.user.id)throw new WatchdogError('Account verification failed.');
 const factors:AccountFactor[]=(user.factors??[]).filter((f:AccountFactor)=>f.factor_type==='totp').map((f:AccountFactor)=>({id:f.id,factor_type:f.factor_type,status:f.status,friendly_name:f.friendly_name}));
 return {session,factors,mfaRequired:requiresAccountMfa(session.accessToken,session.user.id,factors)};
}
export async function accountMfaOperation(operation:string,factorValue:unknown,codeValue:unknown){
 const account=await securityAccount();
 if(operation==='enrol'){
  if(account.factors.some(f=>f.status==='verified'))throw new WatchdogError('An authenticator is already enrolled. Use its verification step.');
  const existing=account.factors.find(f=>f.status!=='verified');
  if(existing)throw new WatchdogError('An unfinished authenticator setup exists. Cancel that unfinished setup before starting again.',409);
  const r=await accountRequest(account.session,'factors',{factor_type:'totp',friendly_name:'APGI Training authenticator',issuer:'APGI Training'});
  if(!r.ok)throw new WatchdogError('The provider could not start authenticator setup. Check MFA provider settings.',503);
  const result=await r.json();if(!result.id||!result.totp?.qr_code||!result.totp?.secret)throw new WatchdogError('Authenticator setup did not return a complete response.',503);
  return {factorId:result.id,qr:result.totp.qr_code,secret:result.totp.secret};
 }
 const id=watchdogId(String(factorValue)),factor=account.factors.find(f=>f.id===id);
 if(!factor)throw new WatchdogError('This authenticator is unavailable.',404);
 if(operation==='cancel'){
  if(factor.status==='verified')throw new WatchdogError('A verified authenticator cannot be removed through this setup form.');
  const r=await fetch(`https://${STAGING_DATABASE_REF}.supabase.co/auth/v1/factors/${id}`,{method:'DELETE',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,authorization:`Bearer ${account.session.accessToken}`},cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new WatchdogError('The unfinished setup could not be cancelled.',503);return {cancelled:true};
 }
 if(operation!=='verify'||!/^\d{6}$/.test(String(codeValue)))throw new WatchdogError('Enter the six-digit code from your authenticator.',400);
 const challenge=await accountRequest(account.session,`factors/${id}/challenge`,{});
 if(!challenge.ok)throw new WatchdogError('A verification challenge is unavailable. Try again shortly.',429);
 const data=await challenge.json();const verified=await accountRequest(account.session,`factors/${id}/verify`,{challenge_id:data.id,code:String(codeValue)});
 if(!verified.ok)throw new WatchdogError('The code was not accepted. Use a fresh code and try again.',400);
 const tokens=await verified.json();if(tokens.user?.id!==account.session.user.id||!tokens.access_token)throw new WatchdogError('Verified account identity did not match.');
 await storeVerifiedSession(tokens);return {verified:true};
}
