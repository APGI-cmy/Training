import {describe,it,expect} from 'vitest';
import {stripeEventDigest} from '@/lib/stripe-event-digest';
const event={id:'evt_same',type:'checkout.session.completed',livemode:false,data:{object:{id:'cs_same',amount_total:13711,currency:'usd',payment_intent:'pi_same'}}};
describe('Signed Stripe delivery identity',()=>{
 it('does not mistake delivery counters, formatting or object-key order for a changed financial event',()=>{const retry={pending_webhooks:0,data:{object:{currency:'usd',id:'cs_same',payment_intent:'pi_same',amount_total:13711}},livemode:false,type:'checkout.session.completed',id:'evt_same'};expect(stripeEventDigest(retry)).toBe(stripeEventDigest(event));});
 it('changes if an amount, intent, event type or test boundary changes',()=>{for(const changed of [{...event,type:'charge.refunded'},{...event,livemode:true},{...event,data:{object:{...event.data.object,amount_total:1}}},{...event,data:{object:{...event.data.object,payment_intent:'pi_changed'}}}])expect(stripeEventDigest(changed)).not.toBe(stripeEventDigest(event));});
});
