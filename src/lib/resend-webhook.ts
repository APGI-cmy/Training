import {createHmac,timingSafeEqual} from 'node:crypto';
const allowed=new Set(['sent','delivered','delivery_delayed','opened','clicked','bounced','complained','failed','suppressed']);
export function verifyMailWebhook(raw:string,headers:Headers,secret:string,now=Date.now()){
 const id=headers.get('svix-id')??'',timestamp=headers.get('svix-timestamp')??'',signatures=headers.get('svix-signature')??'';
 if(!id||id.length>200||!/^\d+$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>300||!secret.startsWith('whsec_'))throw Error('Invalid signature');
 const key=Buffer.from(secret.slice(6),'base64');if(key.length<16)throw Error('Invalid signing secret');
 const expected=createHmac('sha256',key).update(`${id}.${timestamp}.${raw}`).digest();
 const valid=signatures.split(' ').some(item=>{const [version,value]=item.split(',');if(version!=='v1'||!value)return false;const actual=Buffer.from(value,'base64');return actual.length===expected.length&&timingSafeEqual(actual,expected);});
 if(!valid)throw Error('Invalid signature');
 const event=JSON.parse(raw) as {type?:string;created_at?:string;data?:{email_id?:string}};
 const kind=event.type?.replace(/^email\./,'');if(!kind||!allowed.has(kind))return null;
 if(!/^[a-z0-9-]{10,100}$/i.test(event.data?.email_id??'')||!event.created_at||!Number.isFinite(Date.parse(event.created_at)))throw Error('Invalid event');
 return {event_key:id,provider_id:event.data!.email_id!,kind,occurred_at:new Date(event.created_at).toISOString()};
}
