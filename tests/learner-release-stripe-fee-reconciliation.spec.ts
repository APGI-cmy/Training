import {describe,it,expect} from 'vitest';
import {reconcileStripeFee,StripeFeePending,type StripeFeeTransaction} from '@/lib/stripe-fee-reconciliation';
const order={amount:13711,currency:'usd',payment_intent:'pi_test'},charge='ch_test';
const transaction:StripeFeeTransaction={id:'txn_test',source:charge,type:'charge',amount:19195,fee:850,net:18345,currency:'cad',exchange_rate:1.4};
describe('Actual processor fees and recorded exchange evidence',()=>{
 it('converts the actual settlement fee using Stripe’s rate and records both currencies',()=>{expect(reconcileStripeFee(order,charge,transaction)).toMatchObject({processorFee:608,settlementFee:850,settlementCurrency:'cad',presentmentCurrency:'usd',exchangeRate:'1.4',rounding:'up_to_minor_unit'});});
 it('keeps a fee in the original currency unchanged, including zero',()=>{const b={...transaction,amount:13711,fee:0,net:13711,currency:'usd',exchange_rate:null};expect(reconcileStripeFee(order,charge,b).processorFee).toBe(0);});
 it.each([null,undefined])('waits for a missing balance transaction',b=>expect(()=>reconcileStripeFee(order,charge,b)).toThrow(StripeFeePending));
 it.each([{exchange_rate:null},{exchange_rate:0},{exchange_rate:-1},{source:'ch_other'},{currency:'jpy'},{amount:20000},{net:0},{fee:-1},{fee:20000},{fee:1.5},{id:'not-a-transaction'}])('rejects incomplete or inconsistent evidence: %o',change=>expect(()=>reconcileStripeFee(order,charge,{...transaction,...change})).toThrow(StripeFeePending));
 it('uses exact integer arithmetic for fractional-cent fees',()=>{expect(reconcileStripeFee({amount:10000,currency:'cad',payment_intent:'pi_test'},charge,{...transaction,currency:'usd',amount:7500,fee:241,net:7259,exchange_rate:.75}).processorFee).toBe(322);});
 it('does not accept a changed settlement amount in the same currency',()=>expect(()=>reconcileStripeFee(order,charge,{...transaction,currency:'usd',amount:13712,fee:12,net:13700,exchange_rate:null})).toThrow());
});
