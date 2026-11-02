import 'server-only';
import {providerFetch as fetch} from '@/server/security/provider-fetch';
import {getSupabaseRestUrl} from './session';
import {verifiedSessionClaims,activeVerifiedSession} from './session-assurance';
import {claimSecurityBudget} from '@/server/security/auth-budget';
type RecoveryUser={id:string;email?:string;app_metadata?:{watchdog_run?:string};factors?:{id:string;factor_type:string;status:string}[]};
async function recoveryRequest(token:string,path:string,body?:unknown){
 const url=getSupabaseRestUrl('/auth/v1/'+path),key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)throw Error('Recovery verification is temporarily unavailable.');
 return fetch(url,{method:body===undefined?'GET':'POST',headers:{apikey:key,authorization:'Bearer '+token,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
}
export async function recoveryIdentity(token:string){
 const r=await recoveryRequest(token,'user');if(!r.ok)throw Error('Your reset session has expired. Request a fresh recovery email.');
 const user:RecoveryUser=await r.json();if(!user.id)throw Error('Your reset session could not be verified.');
 if(!await activeVerifiedSession(token,user.id))throw Error('Your reset session has expired. Request a fresh recovery email.');
 const factor=user.factors?.find(f=>f.factor_type==='totp'&&f.status==='verified');
 return {user,factor,needsMfa:!!factor&&verifiedSessionClaims(token,user.id)?.aal!=='aal2'};
}
export async function stepUpRecovery(token:string,code:string,testRun?:string){
 if(!/^\d{6}$/.test(code))throw Error('Enter the six-digit code from your authenticator.');
 const identity=await recoveryIdentity(token);
 if(!identity.needsMfa||!identity.factor)throw Error('Reload the password recovery page to continue.');
 if(testRun&&(!identity.user.email?.startsWith('watchdog-'+testRun+'-')||!identity.user.email.endsWith('@example.invalid')||identity.user.app_metadata?.watchdog_run!==testRun))throw Error('Synthetic recovery guard failed.');
 if(!await claimSecurityBudget('mfa-verify:'+identity.user.id,6,300,testRun))throw Error('Too many authenticator attempts. Wait five minutes and use a fresh code.');
 const challenge=await recoveryRequest(token,`factors/${identity.factor.id}/challenge`,{});if(!challenge.ok)throw Error('A verification challenge is unavailable. Try again shortly.');
 const r=await recoveryRequest(token,`factors/${identity.factor.id}/verify`,{challenge_id:(await challenge.json()).id,code});
 if(!r.ok)throw Error('The code was not accepted. Use a fresh authenticator code.');
 const value=await r.json();
 if(value.user?.id!==identity.user.id||verifiedSessionClaims(value.access_token,identity.user.id)?.aal!=='aal2')throw Error('Recovery account verification did not match.');
 return value.access_token as string;
}
