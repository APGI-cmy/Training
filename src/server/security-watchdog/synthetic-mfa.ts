import 'server-only';
import {providerFetch as fetch} from '@/server/security/provider-fetch';
import {STAGING_DATABASE_REF} from '@/server/environment-isolation';
import {verifiedSessionClaims} from '@/server/auth/session-assurance';
import {syntheticTotp} from './synthetic-totp';
import type {AlpSession} from '@/server/auth/session';
import {stepUpRecovery} from '@/server/auth/recovery-mfa';
const fixtureFactors=new WeakMap<AlpSession,{secret:string;verifiedWindow:number}>();
export async function stepUpFixture(run:string,user:{id:string;session:AlpSession}){
 if(!/^watchdog-[a-f0-9-]+-[123]@example\.invalid$/.test(user.session.user.email??'')||!user.session.user.email?.startsWith('watchdog-'+run+'-'))throw Error('Synthetic identity guard failed');
 const call=(path:string,body:unknown)=>fetch(`https://${STAGING_DATABASE_REF}.supabase.co/auth/v1/${path}`,{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,authorization:`Bearer ${user.session.accessToken}`,'content-type':'application/json'},body:JSON.stringify(body)});
 const enrol=await call('factors',{factor_type:'totp',friendly_name:'Disposable Watchdog fixture',issuer:'APGI synthetic test'});if(!enrol.ok)throw Error('Synthetic enrolment unavailable');
 const factor=await enrol.json();if(!factor.id||!factor.totp?.secret)throw Error('Synthetic factor incomplete');
 const challenge=await call(`factors/${factor.id}/challenge`,{});if(!challenge.ok)throw Error('Synthetic challenge unavailable');
 const verified=await call(`factors/${factor.id}/verify`,{challenge_id:(await challenge.json()).id,code:syntheticTotp(factor.totp.secret)});if(!verified.ok)throw Error('Synthetic verification unavailable');
 const tokens=await verified.json();if(tokens.user?.id!==user.id||verifiedSessionClaims(tokens.access_token,user.id)?.aal!=='aal2')throw Error('Synthetic verification mismatch');
 const check=await fetch(`https://${STAGING_DATABASE_REF}.supabase.co/auth/v1/user`,{headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,authorization:`Bearer ${tokens.access_token}`}});
 if(!check.ok||(await check.json()).id!==user.id)throw Error('Synthetic identity verification failed');
 user.session.accessToken=tokens.access_token;user.session.user.factors=[{id:factor.id,status:'verified',factor_type:'totp'}];
 fixtureFactors.set(user.session,{secret:factor.totp.secret,verifiedWindow:Math.floor(Date.now()/30000)});
}
export async function stepUpRecoveredFixture(run:string,user:{id:string;session:AlpSession},budgetRun?:string){
 if(!user.session.user.email?.startsWith('watchdog-'+run+'-')||!user.session.user.email.endsWith('@example.invalid'))throw Error('Synthetic recovery guard failed');
 const factor=fixtureFactors.get(user.session);if(!factor)throw Error('Synthetic authenticator unavailable');
 // Use a fresh time window so the drill never relies on replay of an OTP.
 if(Math.floor(Date.now()/30000)<=factor.verifiedWindow)await new Promise(resolve=>setTimeout(resolve,(factor.verifiedWindow+1)*30000-Date.now()+300));
 user.session.accessToken=await stepUpRecovery(user.session.accessToken,syntheticTotp(factor.secret),budgetRun);
}
