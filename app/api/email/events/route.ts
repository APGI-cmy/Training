import {verifyMailWebhook} from '@/lib/resend-webhook';
import {adminRest} from '@/server/supabase/admin-rest';
export const runtime='nodejs';
export async function POST(request:Request){
 const secret=process.env.ALP_ENVIRONMENT==='v2-staging'?process.env.STAGING_RESEND_WEBHOOK_SECRET:process.env.RESEND_WEBHOOK_SECRET;
 if(!secret)return Response.json({error:'Email events are not configured'},{status:503});
 if(Number(request.headers.get('content-length')??0)>262144)return new Response(null,{status:413});
 const raw=await request.text();if(Buffer.byteLength(raw)>262144)return new Response(null,{status:413});
 let event;try{event=verifyMailWebhook(raw,request.headers,secret);}catch{return Response.json({error:'Invalid email event'},{status:400});}
 if(!event)return new Response(null,{status:204});
 const saved=await adminRest('/rest/v1/v2_mail_events?on_conflict=event_key',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates'},body:JSON.stringify(event)});
 return new Response(null,{status:saved.ok?204:503});
}
