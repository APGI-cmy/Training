import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {paymentProbes,paymentCheckNames} from '@/server/security-watchdog/payment-probes';
import {assertNoPaymentDetails} from '@/lib/payment-input';
import type {Probe} from '@/server/security-watchdog/additional-probes';
beforeEach(()=>vi.stubEnv('ALP_STRIPE_SETUP_KEY',Buffer.alloc(32,9).toString('base64')));
afterEach(()=>vi.unstubAllEnvs());
describe('payment protection exercise',()=>{
 it('exercises real validators with synthetic data and no network calls',async()=>{const network=vi.spyOn(globalThis,'fetch'),states=new Map<string,boolean>();const check:Probe=async(id,_t,_k,_d,test)=>{const ok=await test();states.set(id,ok);return ok;};await paymentProbes(check);expect([...states.keys()]).toEqual(paymentCheckNames.map(c=>c.id));expect([...states.values()]).toEqual(Array(paymentCheckNames.length).fill(true));expect(network).not.toHaveBeenCalled();network.mockRestore();});
 it('fails closed for nested payment-field spelling and never echoes its value',()=>{for(const name of ['bank_number','bank-account-number','CARD NUMBER','cvv','iban']){const f=new FormData();f.set(name,'private-test-value');try{assertNoPaymentDetails(f);throw Error('not rejected');}catch(e){expect(String(e)).toContain('hosted form');expect(String(e)).not.toContain('private-test-value');}}});
});
