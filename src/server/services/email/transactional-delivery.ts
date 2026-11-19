import {providerFetch as fetch} from '@/server/security/provider-fetch';
import "server-only";
import { stagingEmailEnabled, STAGING_ORIGIN } from "@/server/environment-isolation";
import {beginMailAttempt,finishMailAttempt,type MailTracking} from './delivery-ledger';
import {singleRecipient} from '@/server/security/outbound';
import {escapeEmail} from '@/lib/email-format';
import {backupEmailConfiguration,backupEmailNotice} from '@/lib/backup-email';

export function emailConfiguration() {
  const staging=process.env.ALP_ENVIRONMENT==='v2-staging';
  if(process.env.ALP_ENVIRONMENT==='training-production'&&process.env.ALP_EMAIL_MODE!=='transactional')return null;
  if(staging && !stagingEmailEnabled())return null;
  const apiKey=(staging?process.env.STAGING_RESEND_API_KEY:process.env.RESEND_API_KEY)?.trim();
  const rawFrom=(staging?process.env.STAGING_EMAIL_FROM:process.env.EMAIL_FROM)?.trim();
  const appUrl=process.env.NEXT_PUBLIC_APP_URL?.trim();
  if(!apiKey || !rawFrom || !appUrl || /[\r\n]/.test(rawFrom))return null;
  try {
    const origin=new URL(appUrl);
    if((process.env.NODE_ENV==='production' && origin.protocol!=='https:') || (staging && origin.origin!==STAGING_ORIGIN))return null;
    const mailbox=rawFrom.match(/<([^<>]+)>$/)?.[1]??rawFrom;
    if(staging && !/^[^\s<>@]+@apginc\.ca$/i.test(mailbox))return null;
    return {apiKey,from:staging?`APGI Training V2 <${mailbox}>`:rawFrom,origin,staging};
  } catch {return null;}
}

export type DeliveryBrand={name:string;from?:string|null;verified?:boolean;logo?:string|null};
export function previewTransactionalEmail(input:{subject:string;html:string;text:string;branding?:DeliveryBrand}){
 const staging=process.env.ALP_ENVIRONMENT==='v2-staging';
 const notice='VERSION 2 TEST ENVIRONMENT. This message concerns the separate Version 2 platform. It does not change your Version 1 account or course access. Use a separate Version 2 account with this email address.';
 const banner=`<div role="note" style="margin:0;padding:16px 24px;background:#fff5d6;color:#17324d;font:14px Arial,sans-serif;line-height:1.6"><strong>VERSION 2 TEST ENVIRONMENT</strong><p style="margin:8px 0 0">This message concerns the separate Version 2 platform. It does not change your Version 1 account or course access.</p><p style="margin:8px 0 0">Use a separate Version 2 account with this email address.</p></div>`;
 // Account and system messages are trusted server-generated fragments. Give
 // them the same frame; a complete company-branded document stays intact.
 const frameBrand=input.branding?.name??"APGI Training",frameLogo=input.branding?input.branding.logo:`${STAGING_ORIGIN}/branding/apgi-logo.png`;
 const document=/<body\b[^>]*>/i.test(input.html)?input.html:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#edf3f7;font:16px Arial,sans-serif;color:#17324d;line-height:1.65"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="760" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:760px;background:#ffffff;border:1px solid #d6e1e8"><tr><td style="padding:26px;border-top:5px solid #102b47">${frameLogo?`<img src="${escapeEmail(frameLogo)}" alt="${escapeEmail(frameBrand)} logo" width="150" style="display:block;width:150px;max-width:100%;height:auto;border:0;margin:0 0 18px">`:""}<p style="font:bold 24px Arial,sans-serif;margin:0 0 22px">${escapeEmail(frameBrand)}</p><h1 style="font-size:25px;line-height:1.35;margin:0 0 20px">${escapeEmail(input.subject)}</h1><div style="font:16px Arial,sans-serif;line-height:1.65">${input.html}</div><hr style="border:0;border-top:1px solid #d6e1e8;margin:24px 0"><p style="font-size:12px;line-height:1.6;color:#557084;margin:0">${input.branding?"":"Hosted by APGI"}</p></td></tr></table></td></tr></table></body></html>`;
 const backup=backupEmailConfiguration(),backupNotice=backup?backupEmailNotice(input.branding?.name??'Your training provider'):null;
 const footnote=backupNotice?`<div role="note" style="max-width:712px;margin:16px auto;padding:12px 24px;color:#557084;font:12px Arial,sans-serif;line-height:1.6"><p style="margin:0">${escapeEmail(backupNotice)} <a href="https://legal.apgi.app/training/privacy">Privacy policy</a></p></div>`:'';
 const rendered=footnote?document.replace(/<\/body>/i,footnote+'</body>'):document;
 const html=!staging?rendered:rendered.replace(/(<body\b[^>]*>)/i,`$1${banner}`);
 const text=(staging?notice+'\n\n':'')+input.text+(backupNotice?'\n\n'+backupNotice+'\nPrivacy policy: https://legal.apgi.app/training/privacy':'');
 const privacy=process.env.NEXT_PUBLIC_APP_URL+'/privacy';
 return {subject:(staging?(input.branding?'['+input.branding.name+' TEST] ':'[APGI V2 TEST] '):'')+input.subject,html:backup?html.replaceAll('https://legal.apgi.app/training/privacy',privacy):html,text:backup?text.replaceAll('https://legal.apgi.app/training/privacy',privacy):text};
}
export async function deliverTransactionalEmail(input:{to:string;subject:string;html:string;text:string;idempotencyKey:string;tracking?:MailTracking|false;branding?:DeliveryBrand}) {
  const config=emailConfiguration();
  if(!config)return {ok:false as const,error:'EMAIL_NOT_CONFIGURED' as const};
  if(!singleRecipient(input.to,config.staging))return {ok:false as const,error:'EMAIL_DELIVERY_FAILED' as const};
  if(process.env.ALP_ENVIRONMENT==='training-production'){
    // Bind every production message category to the dedicated tenant's verified
    // identity, even older notification jobs without their own sender fields.
    const {productionCompanyId}=await import('@/server/services/tenant-courses');
    const company=productionCompanyId();
    if(!company||input.tracking&&input.tracking.organisationId&&input.tracking.organisationId!==company)return {ok:false as const,error:'EMAIL_NOT_CONFIGURED' as const};
    try{
      const {recipientBrand}=await import('./recipient-brand');
      const identity=await recipientBrand(input.to,company);
      const backup=backupEmailConfiguration();
      if(!identity||(!backup&&(!identity.verified||!identity.from))||input.branding&&input.branding.name!==identity.name)return {ok:false as const,error:'EMAIL_NOT_CONFIGURED' as const};
      input={...input,tracking:input.tracking?{...input.tracking,organisationId:company}:input.tracking,branding:{name:backup?identity.name+' Training':identity.name,from:backup?.from??identity.from,verified:!!backup||identity.verified,logo:identity.logo}};
      // Never resurrect a saved provider-branded template on a partner site.
      if(/Hosted by APGI|>\s*APGI Training\s*</i.test(input.html))return {ok:false as const,error:'EMAIL_NOT_CONFIGURED' as const};
    }catch{return {ok:false as const,error:'EMAIL_NOT_CONFIGURED' as const};}
  }
  let sender=config.from;
  if(input.branding){const display=input.branding.name.replace(/[\r\n<>]/g,'').slice(0,120);if(config.staging){sender=`${display} <${config.from.match(/<([^<>]+)>$/)?.[1]??config.from}>`;}else{if(!input.branding.verified||!input.branding.from||!singleRecipient(input.branding.from,false))return {ok:false as const,error:'EMAIL_NOT_CONFIGURED' as const};sender=`${display} <${input.branding.from}>`;}}
  let attempt:string|undefined;
  try {
    if(input.tracking){
      const saved=await beginMailAttempt({...input,tracking:input.tracking,subject:previewTransactionalEmail(input).subject});attempt=saved.id;
      if(saved.state==='accepted'&&saved.provider_id)return {ok:true as const,providerMessageId:saved.provider_id};
    }
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${config.apiKey}`,'content-type':'application/json','idempotency-key':input.idempotencyKey},body:JSON.stringify({from:sender,to:[input.to],...previewTransactionalEmail(input),tags:config.staging?[{name:'environment',value:'v2-staging'}]:undefined}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
    if(!response.ok){if(attempt)await finishMailAttempt(attempt,{error:response.status===429?'Email provider rate limit reached. Try again later.':`Email provider rejected this attempt (HTTP ${response.status}).`});return {ok:false as const,error:'EMAIL_DELIVERY_FAILED' as const};}
    const payload=await response.json() as {id?:string};
    // A successful HTTP response without a provider ID is not delivery evidence.
    if(!payload.id){if(attempt)await finishMailAttempt(attempt,{error:'The provider returned no email identifier. Delivery is not confirmed.'});return {ok:false as const,error:'EMAIL_DELIVERY_FAILED' as const};}
    if(attempt)await finishMailAttempt(attempt,{providerId:payload.id});
    return {ok:true as const,providerMessageId:payload.id};
  } catch {
    // A timeout may follow acceptance. Leave an unresolved attempt visible;
    // retrying the same provider key cannot create a second email.
    if(attempt)await adminAttemptUnknown(attempt);
    return {ok:false as const,error:'EMAIL_DELIVERY_FAILED' as const};
  }
}
async function adminAttemptUnknown(id:string){
 const {adminRest}=await import('@/server/supabase/admin-rest');
 try{await adminRest(`/rest/v1/v2_mail_attempts?id=eq.${encodeURIComponent(id)}&state=eq.sending`,{method:'PATCH',body:JSON.stringify({state:'unknown',error:'Provider acceptance could not be confirmed. Check delivery events before resending.'})});}catch{/* Retain the sending record for reconciliation. */}
}
