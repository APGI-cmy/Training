import {createHash} from 'node:crypto';

function canonical(value:unknown):unknown{
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)]));
 return value;
}
// A delivery's formatting and pending_webhooks count are not financial identity.
// Authentication still verifies the exact raw bytes before this function is used.
export function stripeEventDigest(event:{id:string;type:string;livemode:boolean;data:unknown}){
 return createHash('sha256').update(JSON.stringify(canonical({id:event.id,type:event.type,livemode:event.livemode,data:event.data}))).digest('hex');
}
