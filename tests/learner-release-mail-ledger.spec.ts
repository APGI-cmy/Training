import {beforeEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({rest:vi.fn()}));
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:m.rest}));
import {beginMailAttempt} from '@/server/services/email/delivery-ledger';
beforeEach(()=>{vi.resetAllMocks();m.rest.mockResolvedValue(Response.json({id:'attempt',state:'sending'}));});
describe('Private links are excluded before the logging request',()=>{
 it.each(['admin_invitation','company_invitation','account_recovery','account_confirmation','payment'] as const)('omits %s tokens from transport and storage',async category=>{await beginMailAttempt({tracking:{category},to:'test@example.invalid',subject:'Account help',html:'<a href="SECRET-TOKEN">Open</a>',text:'SECRET-TOKEN',idempotencyKey:'fixture'});const body=JSON.parse(m.rest.mock.calls[0][1].body);expect(body.p_html).toBeNull();expect(body.p_body).not.toContain('SECRET-TOKEN');expect(m.rest.mock.calls[0][1].body).not.toContain('SECRET-TOKEN');});
 it('preserves the saved ordinary email for an exact resend',async()=>{await beginMailAttempt({tracking:{category:'email_set'},to:'test@example.invalid',subject:'Course update',html:'<p>Saved design</p>',text:'Saved design',idempotencyKey:'fixture'});expect(JSON.parse(m.rest.mock.calls[0][1].body)).toMatchObject({p_html:'<p>Saved design</p>',p_body:'Saved design'});});
});
