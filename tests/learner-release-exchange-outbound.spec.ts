import {describe,expect,it} from 'vitest';
import {providerTarget} from '@/server/security/provider-fetch';
import {PLATFORM_RELEASE} from '@/lib/platform-release';
const origin=PLATFORM_RELEASE.targets[1].origin;
const init={method:'POST',headers:{authorization:'Bearer eyJsynthetic.token.signature','content-type':'application/json'},body:JSON.stringify({action:'refresh',version:PLATFORM_RELEASE.version})};
describe('Signed recipient refresh outbound boundary',()=>{
 it('permits only the code-owned refresh body and registered endpoint',()=>{
  expect(providerTarget(origin+'/api/course-exchange',init).origin).toBe(origin);
  for(const url of [origin+'/api/other',origin+'/api/course-exchange?other=1','https://unregistered.example/api/course-exchange'])expect(()=>providerTarget(url,init)).toThrow('REJECTED');
 });
 it('rejects additional data or provider credentials on the course exchange',()=>{
  for(const body of [JSON.stringify({action:'refresh',version:'old'}),JSON.stringify({action:'refresh',version:PLATFORM_RELEASE.version,learners:['private']})])expect(()=>providerTarget(origin+'/api/course-exchange',{...init,body})).toThrow('REJECTED');
  expect(()=>providerTarget(origin+'/api/course-exchange',{...init,headers:{...init.headers,apikey:'not-for-this-host'}})).toThrow('CREDENTIAL_REJECTED');
 });
});
