import "server-only";
import { stagingEmailEnabled, STAGING_ORIGIN } from "@/server/environment-isolation";

export function emailConfiguration() {
  const staging=process.env.ALP_ENVIRONMENT==='v2-staging';
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

export async function deliverTransactionalEmail(input:{to:string;subject:string;html:string;text:string;idempotencyKey:string}) {
  const config=emailConfiguration();
  if(!config)return {ok:false as const,error:'EMAIL_NOT_CONFIGURED' as const};
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.to) || (config.staging && /\.invalid$/i.test(input.to)))return {ok:false as const,error:'EMAIL_DELIVERY_FAILED' as const};
  const notice='VERSION 2 TEST ENVIRONMENT. This message concerns the separate Version 2 platform. It does not change your Version 1 account or course access. Use a separate Version 2 account with this email address.';
  try {
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${config.apiKey}`,'content-type':'application/json','idempotency-key':input.idempotencyKey},body:JSON.stringify({from:config.from,to:[input.to],subject:(config.staging?'[APGI V2 TEST] ':'')+input.subject,html:(config.staging?`<p><strong>${notice}</strong></p>`:'')+input.html,text:(config.staging?notice+'\n\n':'')+input.text,tags:config.staging?[{name:'environment',value:'v2-staging'}]:undefined}),cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!response.ok)return {ok:false as const,error:'EMAIL_DELIVERY_FAILED' as const};
    const payload=await response.json() as {id?:string};
    // A successful HTTP response without a provider ID is not delivery evidence.
    if(!payload.id)return {ok:false as const,error:'EMAIL_DELIVERY_FAILED' as const};
    return {ok:true as const,providerMessageId:payload.id};
  } catch {return {ok:false as const,error:'EMAIL_DELIVERY_FAILED' as const};}
}
