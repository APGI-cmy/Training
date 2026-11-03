import {describe,it,expect,vi} from 'vitest';
// This dependency-free script also runs outside the application host.
// @ts-expect-error Native observer is intentionally a standalone .mjs file.
import {observe,observerOrigin} from '../scripts/watchdog-external-observer.mjs';
const key='MCowBQYDK2VwAyEA3LKXpik3eIt/9dYqLpJfOVRenkk5aUsirLKGyUESzEU=';
function fixture(url:string){const p=new URL(url).pathname,headers={'cache-control':'private, no-store'};
 if(p.endsWith('edge-control'))return new Response('APGI-WATCHDOG-EDGE-CONTROL',{headers});
 if(p.endsWith('edge-canary')||p.startsWith('/courses/'))return new Response(null,{status:403,headers});
 if(p.endsWith('course-deployment'))return Response.json({version:1,projectId:'prj_XaAAh2r1oRKGsi8HLxXGDzcI1yaf',deployment:{id:'dpl_test',commit:'a'.repeat(40)},courses:{course:'b'.repeat(64)}},{headers});
 if(p.endsWith('/keys'))return Response.json({algorithm:'Ed25519',publicKey:key},{headers});
 return new Response(null,{status:401,headers});
}
describe('external observer fail-closed behaviour',()=>{
 it('checks known public controls without accounts, cookies or redirects',async()=>{const f=vi.fn(async(url,init)=>{expect(url.startsWith(observerOrigin+'/')).toBe(true);expect(init.redirect).toBe('error');expect(init.credentials).toBe('omit');expect(init.headers).not.toHaveProperty('authorization');expect(init.headers).not.toHaveProperty('cookie');return fixture(url);});const r=await observe({fetcher:f});expect(r.passed).toBe(true);expect(r.checks).toHaveLength(6);expect(f).toHaveBeenCalledTimes(6);});
 it('reports a public private-course file as a failure',async()=>{const r=await observe({fetcher:async(url:string)=>url.includes('/courses/')?new Response(null,{status:200}):fixture(url)});expect(r.passed).toBe(false);expect(r.checks.find((c:{id:string})=>c.id==='private_course').state).toBe('failed');});
 it('does not treat a login page or generic 200 as availability',async()=>{const r=await observe({fetcher:async()=>new Response('<html>Sign in</html>')});expect(r.passed).toBe(false);expect(r.checks.every((c:{state:string})=>c.state!=='passed')).toBe(true);});
 it('does not count a transport failure as a successful access denial or log its details',async()=>{const r=await observe({fetcher:async()=>{throw Error('secret-provider-message');}});expect(r.passed).toBe(false);expect(r.checks.every((c:{state:string})=>c.state==='inconclusive')).toBe(true);expect(JSON.stringify(r)).not.toContain('secret-provider-message');});
 it('rejects a different project even if it responds successfully',async()=>{const r=await observe({fetcher:async(url:string)=>url.endsWith('/api/course-deployment')?Response.json({version:1,projectId:'V1',deployment:{id:'dpl_test',commit:'a'.repeat(40)},courses:{course:'b'.repeat(64)}},{headers:{'cache-control':'no-store'}}):fixture(url)});expect(r.checks.find((c:{id:string})=>c.id==='release_identity').state).toBe('failed');});
 it('rejects a substituted verification key',async()=>{const r=await observe({fetcher:async(url:string)=>url.endsWith('/keys')?Response.json({algorithm:'Ed25519',publicKey:'attacker-key'},{headers:{'cache-control':'no-store'}}):fixture(url)});expect(r.checks.find((c:{id:string})=>c.id==='trusted_key').state).toBe('failed');});
 it('requires private responses to prevent caching',async()=>{const r=await observe({fetcher:async(url:string)=>url.includes('/courses/')?new Response(null,{status:403}):fixture(url)});expect(r.checks.find((c:{id:string})=>c.id==='private_course').state).toBe('failed');});
 it('bounds public response bodies and does not retain response text',async()=>{const r=await observe({fetcher:async(url:string)=>url.endsWith('edge-control')?new Response('private-data'.repeat(4000),{headers:{'cache-control':'no-store'}}):fixture(url)});expect(r.checks[0].state).toBe('inconclusive');expect(JSON.stringify(r)).not.toContain('private-data');});
 it('rejects a response followed to another origin',async()=>{const r=await observe({fetcher:async(url:string)=>{const r=fixture(url);Object.defineProperty(r,'url',{value:'https://attacker.example/'});return r;}});expect(r.passed).toBe(false);expect(r.checks.every((c:{state:string})=>c.state==='inconclusive')).toBe(true);});
});
