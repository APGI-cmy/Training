import {beforeEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({rest:vi.fn()}));
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:m.rest}));
vi.mock('@/server/services/notifications',()=>({notificationSession:vi.fn()}));
import {messageRpc} from '@/server/services/messages';
beforeEach(()=>vi.clearAllMocks());
describe('Message RPC response contracts',()=>{
 it.each(['v2_message_manage','v2_message_schedule_toggle'])('accepts a successful empty response from %s',async name=>{
  m.rest.mockResolvedValue(new Response(null,{status:204}));
  await expect(messageRpc<void>(name,{p_actor:'actor'})).resolves.toBeUndefined();
  expect(m.rest).toHaveBeenCalledWith(`/rest/v1/rpc/${name}`,expect.objectContaining({method:'POST',body:JSON.stringify({p_actor:'actor'})}));
 });
 it.each([{threads:[]},'saved-thread-id',0,null])('preserves JSON return values: %j',async value=>{
  m.rest.mockResolvedValue(Response.json(value));expect(await messageRpc('v2_message_workspace',{})).toEqual(value);
 });
 it('does not turn a denied change into success',async()=>{
  m.rest.mockResolvedValue(Response.json({code:'P0001',message:'Message unavailable'},{status:403}));
  await expect(messageRpc('v2_message_manage',{})).rejects.toThrow('Message unavailable');
 });
 it('keeps malformed data responses as failures rather than hiding them',async()=>{
  m.rest.mockResolvedValue(new Response('{"incomplete":',{status:200}));
  await expect(messageRpc('v2_message_detail',{})).rejects.toThrow();
 });
});
