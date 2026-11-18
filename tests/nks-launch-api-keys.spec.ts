import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {providerFetch} from '@/server/security/provider-fetch';
const network=vi.fn();
const url='https://rbfzsttqbaocokzbvpbf.supabase.co/rest/v1/organisations';
beforeEach(()=>{vi.stubEnv('ALP_ENVIRONMENT','training-production');vi.stubGlobal('fetch',network);network.mockResolvedValue(Response.json([]));});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.resetAllMocks();});
describe('Modern production Supabase credentials',()=>{
 it.each(['sb_secret_fixture_not_a_real_key','sb_publishable_fixture_not_a_real_key'])('sends %s as an API key without treating it as a JWT',async key=>{
  await providerFetch(url,{headers:{apikey:key,authorization:`Bearer ${key}`}});
  const sent=new Headers(network.mock.calls[0][1].headers);
  expect(sent.get('apikey')).toBe(key);expect(sent.has('authorization')).toBe(false);
 });
 it('preserves a signed-in user bearer token alongside a publishable key',async()=>{
  await providerFetch(url,{headers:{apikey:'sb_publishable_fixture',authorization:'Bearer user.signed.jwt'}});
  expect(new Headers(network.mock.calls[0][1].headers).get('authorization')).toBe('Bearer user.signed.jwt');
 });
 it('preserves the existing legacy service-role transport',async()=>{
  await providerFetch(url,{headers:{apikey:'legacy.fixture.jwt',authorization:'Bearer legacy.fixture.jwt'}});
  expect(new Headers(network.mock.calls[0][1].headers).get('authorization')).toBe('Bearer legacy.fixture.jwt');
 });
 it('still refuses forwarding the production key to another destination',async()=>{
  const key='sb_secret_fixture_not_a_real_key';vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY',key);
  await expect(providerFetch('https://eaaqgtdpvbxdgjxphjie.supabase.co/rest/v1/organisations',{headers:{apikey:key,authorization:`Bearer ${key}`}})).rejects.toThrow('OUTBOUND_TARGET_REJECTED');
  expect(network).not.toHaveBeenCalled();
 });
});
