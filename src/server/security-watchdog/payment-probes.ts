import 'server-only';
import {createHmac} from 'node:crypto';
import {stripeRedirect,validateTestCredentials,verifyStripeSignature,sealStripe,openStripe} from '@/lib/stripe-payments';
import {assertNoPaymentDetails} from '@/lib/payment-input';
import type {Probe} from './additional-probes';
export const paymentCheckNames=[
 {id:'payment_destinations',title:'Payment links reject unapproved destinations'},
 {id:'payment_sandbox_keys',title:'V2 payment configuration rejects live keys'},
 {id:'payment_signatures',title:'Payment event integrity and expiry checks'},
 {id:'payment_secret_fields',title:'Raw payment details are rejected by platform setup forms'},
 {id:'payment_vault',title:'Encrypted payment setup detects alteration'},
];
const rejects=(work:()=>unknown)=>{try{work();return false;}catch{return true;}};
export async function paymentProbes(check:Probe){
 const task=(id:string,title:string,detail:string,test:()=>boolean)=>check(id,title,'synthetic_behaviour',detail,async()=>test());
 await task('payment_destinations','Payment links reject unapproved destinations','The deployed payment-link validator accepts its exact HTTPS Stripe destination and rejects impersonation hosts, user-info, non-HTTPS URLs and nonstandard ports. No account link is created.',()=>{
  if(!stripeRedirect('https://checkout.stripe.com/c/pay/synthetic','checkout')||!stripeRedirect('https://connect.stripe.com/setup/s/synthetic','connect'))return false;
  return ['http://connect.stripe.com/setup','https://connect.stripe.com.example.invalid/setup','https://connect.stripe.com@evil.example.invalid/','https://connect.stripe.com:8443/setup','https://checkout.stripe.com/pay'].every(u=>rejects(()=>stripeRedirect(u,'connect')));
 });
 await task('payment_sandbox_keys','V2 payment configuration rejects live keys','A fictional restricted test key passes format validation; fictional live and unrestricted keys are rejected. No real credential or Stripe request is used.',()=>{
  const suffix='SYNTHETICONLY0123456789';validateTestCredentials('rk_test_'+suffix,'whsec_'+suffix);
  return ['rk_live_','sk_live_','sk_test_'].every(prefix=>rejects(()=>validateTestCredentials(prefix+suffix,'whsec_'+suffix)));
 });
 await task('payment_signatures','Payment event integrity and expiry checks','The actual signature validator accepts a fictional correctly signed event and rejects a changed body, changed signature and expired timestamp. No event is submitted or payment created.',()=>{
  const now=Date.now(),time=Math.floor(now/1000),body='{"synthetic":true}',key='watchdog-synthetic-not-a-provider-secret';
  const header='t='+time+',v1='+createHmac('sha256',key).update(time+'.'+body).digest('hex');
  verifyStripeSignature(body,header,key,now);
  return rejects(()=>verifyStripeSignature(body+' ',header,key,now))&&rejects(()=>verifyStripeSignature(body,header.replace(/v1=./,'v1=0')+'1',key,now))&&rejects(()=>verifyStripeSignature(body,header,key,now+301000));
 });
 await task('payment_secret_fields','Raw payment details are rejected by platform setup forms','The same guard used by personal and company setup actions rejects synthetic card/bank-number fields without echoing their values. Provider-hosted forms remain the only place to enter those details.',()=>{
  const safe=new FormData();safe.set('country','CA');safe.set('payment_purpose','on');assertNoPaymentDetails(safe);
  return ['card_number','cvv','bank_account_number','iban','routing_number'].every(name=>{const f=new FormData();f.set(name,'SYNTHETIC-NOT-REAL');return rejects(()=>assertNoPaymentDetails(f));});
 });
 await task('payment_vault','Encrypted payment setup detects alteration','A fictional value is encrypted/decrypted through the real payment-setup codec, then an authentication tag is altered and must fail. Existing private payment credentials are not read.',()=>{
  const sealed=sealStripe({synthetic:'watchdog-payment-codec'});if(openStripe<{synthetic:string}>(sealed).synthetic!=='watchdog-payment-codec')return false;
  const parts=sealed.split('.'),tag=Buffer.from(parts[1],'base64url');tag[0]^=1;parts[1]=tag.toString('base64url');return rejects(()=>openStripe(parts.join('.')));
 });
}
