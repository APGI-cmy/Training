import {createHmac,timingSafeEqual,createCipheriv,createDecipheriv,randomBytes} from "node:crypto";
export const STRIPE_OWNER_EMAIL="jorrie.jordaan@apginc.ca";
export const stripeCrossBorderCountries=new Set("CA US GB AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LI LT LU MT NL NO PL PT RO SK SI ES SE IS CH".split(" "));
export function stripeRoute(country:string){return stripeCrossBorderCountries.has(country)?"stripe":"alternative_required";}
export function validateTestCredentials(key:string,webhook:string){if(!/^rk_test_[A-Za-z0-9]{16,256}$/.test(key)||!/^whsec_[A-Za-z0-9]{16,256}$/.test(webhook))throw Error("Use a restricted sandbox key (rk_test_) and its test webhook signing secret. Live keys are not accepted in V2.");}
function vaultKey(){const key=Buffer.from(process.env.ALP_STRIPE_SETUP_KEY??"","base64");if(key.length!==32)throw Error("Private Stripe setup storage is unavailable.");return key;}
export function sealStripe(value:unknown){const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",vaultKey(),iv);cipher.setAAD(Buffer.from("apgi-v2-stripe-setup-v1"));const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),"utf8"),cipher.final()]);return [iv,cipher.getAuthTag(),encrypted].map(b=>b.toString("base64url")).join(".");}
export function openStripe<T>(value:string):T{const [iv,tag,data]=value.split(".").map(s=>Buffer.from(s,"base64url"));const cipher=createDecipheriv("aes-256-gcm",vaultKey(),iv);cipher.setAAD(Buffer.from("apgi-v2-stripe-setup-v1"));cipher.setAuthTag(tag);return JSON.parse(Buffer.concat([cipher.update(data),cipher.final()]).toString("utf8"));}
export function verifyStripeSignature(body:string,header:string,secret:string,now=Date.now()){
 if(Buffer.byteLength(body)>1024*1024)throw Error("Invalid webhook.");const parts=header.split(","),t=parts.find(p=>p.startsWith("t="))?.slice(2);if(!t||!/^\d+$/.test(t)||Math.abs(now/1000-Number(t))>300)throw Error("Invalid webhook signature.");
 const expected=createHmac("sha256",secret).update(`${t}.${body}`).digest();if(!parts.filter(p=>/^v1=[a-f0-9]{64}$/.test(p)).some(p=>timingSafeEqual(Buffer.from(p.slice(3),"hex"),expected)))throw Error("Invalid webhook signature.");
}
export function stripeRedirect(url:string,kind:"checkout"|"connect"){const u=new URL(url);if(u.protocol!=="https:"||u.username||u.password||u.port||u.hostname!==(kind==="checkout"?"checkout.stripe.com":"connect.stripe.com"))throw Error("Stripe returned an invalid destination.");return u.toString();}
