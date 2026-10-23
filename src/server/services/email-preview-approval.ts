import 'server-only';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import type {EmailDesign,EmailRule} from '@/lib/email-sets';

export type EmailApproval={actor:string;organisation:string;set:string;id:string;revision:number;name:string;design:EmailDesign;rule:EmailRule};
function canonical(value:unknown):unknown{
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)]));
 return value;
}
function digest(input:EmailApproval){return createHash('sha256').update(JSON.stringify(canonical(input))).digest('hex');}
function signature(value:string){
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!secret)throw Error('Email preview approval is unavailable. Please try again later.');
 return createHmac('sha256',secret).update(`v2-email-preview:${value}`).digest();
}
export function signEmailApproval(kind:'preview'|'saved',input:EmailApproval,now=Date.now()){
 const body=Buffer.from(JSON.stringify({kind,digest:digest(input),expires:now+2*60*60*1000})).toString('base64url');
 return `${body}.${signature(body).toString('base64url')}`;
}
export function requireEmailApproval(token:string,kind:'preview'|'saved',input:EmailApproval,now=Date.now()){
 const fail=()=>{throw Error(kind==='preview'?'Preview and accept this email before saving it.':'Preview, accept and save this version before enabling it.');};
 if(!token||token.length>2000)return fail();
 const [body,mac,extra]=token.split('.');if(!body||!mac||extra)return fail();
 const supplied=Buffer.from(mac,'base64url'),expected=signature(body);
 if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return fail();
 try{const payload=JSON.parse(Buffer.from(body,'base64url').toString());if(payload.kind!==kind||payload.digest!==digest(input)||!Number.isFinite(payload.expires)||payload.expires<=now)return fail();}catch{return fail();}
}
