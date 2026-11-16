import {beforeEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({vault:vi.fn(),verify:vi.fn(),process:vi.fn(),failure:vi.fn()}));
vi.mock('@/server/services/stripe-platform',()=>({stripeVault:m.vault}));
vi.mock('@/lib/stripe-payments',()=>({verifyStripeSignature:m.verify}));
vi.mock('@/server/services/stripe-settlement',()=>({processStripeEvent:m.process,recordStripeEventFailure:m.failure}));
import {POST} from '../app/api/stripe/webhook/route';
beforeEach(()=>{vi.clearAllMocks();m.vault.mockResolvedValue({webhook:'test-only-signing-placeholder'});m.verify.mockReturnValue(undefined);m.process.mockResolvedValue(undefined);});
const request=()=>new Request('https://example.test/api/stripe/webhook',{method:'POST',body:JSON.stringify({id:'evt_existing',livemode:false})});
describe('Stripe HTTP receipt boundary',()=>{
 it('returns 200 after the event and any settlement hold are durably recorded',async()=>{const response=await POST(request());expect(response.status).toBe(200);expect(await response.json()).toEqual({received:true});expect(m.process).toHaveBeenCalledOnce();});
 it('returns 503 if durable processing fails so Stripe can retry',async()=>{m.process.mockRejectedValue(Error('Database unavailable'));expect((await POST(request())).status).toBe(503);});
 it('rejects an invalid signature before processing',async()=>{m.verify.mockImplementation(()=>{throw Error('Bad signature');});expect((await POST(request())).status).toBe(400);expect(m.process).not.toHaveBeenCalled();});
});
