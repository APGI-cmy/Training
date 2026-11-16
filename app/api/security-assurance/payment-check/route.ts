import {verifyPaymentProtection} from '@/server/security-watchdog/payment-verification';
import {requireSameOrigin,WatchdogError,watchdogResponseError} from '@/server/security-watchdog/access';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=30;
async function scopeFrom(request:Request){
 if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json'||Number(request.headers.get('content-length')??0)>128)
  throw new WatchdogError('Invalid payment verification request.',400);
 const reader=request.body?.getReader();if(!reader)throw new WatchdogError('Invalid payment verification request.',400);
 const parts:Uint8Array[]=[];let length=0;
 try{for(;;){const next=await reader.read();if(next.done)break;length+=next.value.length;if(length>128)throw new WatchdogError('Payment verification request is too large.',400);parts.push(next.value);}}
 finally{await reader.cancel().catch(()=>{});}
 let body;try{body=JSON.parse(Buffer.concat(parts).toString());}catch{throw new WatchdogError('Invalid payment verification request.',400);}
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>k!=='scope')||('scope' in body&&(typeof body.scope!=='string'||!body.scope)))
  throw new WatchdogError('Invalid payment verification request.',400);
 return body.scope as string|undefined;
}
export async function POST(request:Request){
 try{
  requireSameOrigin(request);
  const result=await verifyPaymentProtection(await scopeFrom(request));
  return Response.json(result,{headers:{'cache-control':'private, no-store','vary':'Cookie','x-content-type-options':'nosniff'}});
 }catch(error){return watchdogResponseError(error);}
}
