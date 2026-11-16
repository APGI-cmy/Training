import {NextResponse} from "next/server";
import {stripeVault} from "@/server/services/stripe-platform";
import {verifyStripeSignature} from "@/lib/stripe-payments";
import {processStripeEvent,recordStripeEventFailure} from "@/server/services/stripe-settlement";
export const runtime="nodejs";
export async function POST(request:Request){
 let body:string;
 try{if(Number(request.headers.get("content-length")??0)>1048576)return new Response(null,{status:413});body=await request.text();const vault=await stripeVault();verifyStripeSignature(body,request.headers.get("stripe-signature")??"",vault.webhook);}catch{return NextResponse.json({error:"Invalid or unconfigured test webhook."},{status:400});}
 let event:unknown;
 try{event=JSON.parse(body);await processStripeEvent(event as Parameters<typeof processStripeEvent>[0],body);return NextResponse.json({received:true});}catch(error){try{await recordStripeEventFailure(event,error);}catch{}return NextResponse.json({error:"Test payment requires retry or reconciliation."},{status:503});}
}
