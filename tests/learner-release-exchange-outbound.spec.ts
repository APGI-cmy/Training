import {describe,expect,it} from 'vitest';
import {providerTarget} from '@/server/security/provider-fetch';
import {PLATFORM_RELEASE} from '@/lib/platform-release';
const origin=PLATFORM_RELEASE.targets[1].origin;
const init={method:'POST',headers:{authorization:'Bearer eyJsynthetic.token.signature','content-type':'application/json'},body:JSON.stringify({action:'refresh',version:PLATFORM_RELEASE.version})};
describe('Signed recipient refresh outbound boundary',()=>{
 it('permits anonymous deployment metadata reads only at registered fixed endpoints',()=>{
  expect(providerTarget(origin+'/api/course-deployment').origin).toBe(origin);
  for(const [url,init] of [[origin+'/api/course-deployment?url=other',{}],['https://unregistered.example/api/course-deployment',{}],[origin+'/api/course-deployment',{method:'POST'}],[origin+'/api/course-deployment',{headers:{authorization:'Bearer secret'}}]] as const)expect(()=>providerTarget(url,init)).toThrow('REJECTED');
 });
 it('permits only the code-owned refresh body and registered endpoint',()=>{
  expect(providerTarget(origin+'/api/course-exchange',init).origin).toBe(origin);
  for(const url of [origin+'/api/other',origin+'/api/course-exchange?other=1','https://unregistered.example/api/course-exchange'])expect(()=>providerTarget(url,init)).toThrow('REJECTED');
 });
 it('rejects additional data or provider credentials on the course exchange',()=>{
  for(const body of [JSON.stringify({action:'refresh',version:'old'}),JSON.stringify({action:'refresh',version:PLATFORM_RELEASE.version,learners:['private']})])expect(()=>providerTarget(origin+'/api/course-exchange',{...init,body})).toThrow('REJECTED');
  expect(()=>providerTarget(origin+'/api/course-exchange',{...init,headers:{...init.headers,apikey:'not-for-this-host'}})).toThrow('CREDENTIAL_REJECTED');
 });
});
