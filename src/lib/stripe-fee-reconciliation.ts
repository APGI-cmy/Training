export type StripeFeeTransaction={id:string;amount:number;fee:number;net:number;currency:string;exchange_rate:number|string|null;source:string;type:string};
export type StripeFeeEvidence={version:1;balanceTransactionId:string;chargeId:string;paymentIntent:string;presentmentCurrency:string;presentmentAmount:number;settlementCurrency:string;settlementAmount:number;settlementFee:number;settlementNet:number;exchangeRate:string;processorFee:number;rounding:'up_to_minor_unit'};
export class StripeFeePending extends Error {}
const supported=new Set(['usd','cad','zar']);

export function reconcileStripeFee(order:{amount:number;currency:string;payment_intent:string},chargeId:string,transaction:StripeFeeTransaction|null|undefined):StripeFeeEvidence{
 if(!transaction||typeof transaction!=='object')throw new StripeFeePending('Stripe has confirmed payment; its actual processor-fee record is not available yet. Automatic reconciliation will retry.');
 const b=transaction;
 if(!supported.has(order.currency)||!supported.has(b.currency)||!/^txn_[A-Za-z0-9]+$/.test(b.id)||b.source!==chargeId||!['charge','payment'].includes(b.type))throw new StripeFeePending('The processor-fee source or currency needs reconciliation. No allocation has been released.');
 if(![order.amount,b.amount,b.fee,b.net].every(Number.isSafeInteger)||order.amount<=0||b.amount<=0||b.fee<0||b.fee>b.amount||b.net!==b.amount-b.fee)throw new StripeFeePending('Stripe gross, fee and net amounts do not reconcile. No allocation has been released.');
 if(b.currency===order.currency&&b.amount!==order.amount)throw new StripeFeePending('The Stripe settlement amount does not match the payment.');
 const rate=b.currency===order.currency?'1':String(b.exchange_rate??'');
 if(!/^[0-9]+(?:\.[0-9]{1,15})?$/.test(rate))throw new StripeFeePending('Stripe has not supplied a usable transaction exchange rate. No estimated conversion will be used.');
 const [whole,fraction='']=rate.split('.'),den=BigInt(10)**BigInt(fraction.length),num=BigInt(whole+fraction);
 if(num<=BigInt(0))throw new StripeFeePending('Stripe has not supplied a positive transaction exchange rate.');
 const gross=(BigInt(order.amount)*num+den/BigInt(2))/den;
 if((gross-BigInt(b.amount)>BigInt(1))||(BigInt(b.amount)-gross>BigInt(1)))throw new StripeFeePending('The Stripe conversion rate does not reconcile to the charged amount. No allocation has been released.');
 const fee=Number((BigInt(b.fee)*den+num-BigInt(1))/num);
 if(!Number.isSafeInteger(fee)||fee>order.amount)throw new StripeFeePending('The converted processor fee exceeds the payment.');
 return {version:1,balanceTransactionId:b.id,chargeId,paymentIntent:order.payment_intent,presentmentCurrency:order.currency,presentmentAmount:order.amount,settlementCurrency:b.currency,settlementAmount:b.amount,settlementFee:b.fee,settlementNet:b.net,exchangeRate:rate,processorFee:fee,rounding:'up_to_minor_unit'};
}
