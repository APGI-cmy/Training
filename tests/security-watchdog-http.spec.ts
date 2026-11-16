import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('@/server/security-watchdog/store',()=>({watchdogRpc:vi.fn()}));
import {watchdogRpc} from '@/server/security-watchdog/store';
import {httpProbes,httpCheckNames} from '@/server/security-watchdog/http-probes';
import type {Probe} from '@/server/security-watchdog/additional-probes';
const users=['owner','foreign','peer'].map(id=>({id,session:{accessToken:id+'-token',user:{id,email:id+'@example.invalid',email_confirmed_at:'yes'}}}));
const runId='44fef034-d82f-4a78-b169-343a69ba0c1f';
let revoked:boolean,positive:boolean,foreignLeak:boolean,states:Map<string,string>;
const check:Probe=async(id,_title,_kind,_detail,test)=>{try{const ok=await test();states.set(id,ok?'passed':'failed');return ok;}catch{states.set(id,'inconclusive');return false;}};
beforeEach(()=>{
 vi.clearAllMocks();revoked=false;positive=true;foreignLeak=false;states=new Map();
 vi.mocked(watchdogRpc).mockImplementation(async(_name,body)=>{if((body as {p_operation:string}).p_operation==='revoke')revoked=true;return {messageId:'synthetic-message'} as never;});
 vi.stubGlobal('fetch',vi.fn(async(input:URL|string,init?:RequestInit)=>{
  const url=new URL(input),cookie=new Headers(init?.headers).get('cookie')??'',owner=cookie.includes('owner-token'),foreign=cookie.includes('foreign-token');
  const privateHeaders={'cache-control':'private, no-store','x-content-type-options':'nosniff'};
  if(url.pathname.startsWith('/courses/'))return new Response(null,{status:owner&&!revoked&&positive||foreign&&foreignLeak?200:403,headers:privateHeaders});
  if(url.pathname==='/_next/image')return new Response(null,{status:400});
  if(url.pathname.startsWith('/api/messages/attachments/'))return new Response(owner?'WATCHDOG-SYNTHETIC-'+runId:null,{status:owner?200:404,headers:privateHeaders});
  if(url.pathname==='/api/payments/reports'&&url.searchParams.get('scope')==='self')return new Response('"user_id","country","state","updated_at"',{status:200,headers:privateHeaders});
  if(url.pathname==='/api/security-assurance')return cookie?url.searchParams.has('scope')?Response.json({},{status:403,headers:privateHeaders}):Response.json({audience:'learner',overall:null,reportHref:'/security-assurance'},{headers:privateHeaders}):Response.json({},{status:401,headers:privateHeaders});
  if(url.pathname==='/api/payments/reports')return new Response(owner&&url.searchParams.get('scope')==='company-a'?'"id","buyer_id"':null,{status:owner&&url.searchParams.get('scope')==='company-a'?200:403,headers:privateHeaders});
  if(url.pathname.includes('/export'))return Response.json({},{status:404});
  if(url.pathname==='/api/scorm'||url.pathname.startsWith('/api/cron/'))return Response.json({},{status:401});
  if(url.pathname.endsWith('/webhook')||url.pathname.endsWith('/events'))return Response.json({},{status:400});
  if(url.pathname==='/api/security-watchdog')return Response.json({},{status:403});
  if(url.pathname.startsWith('/api/notifications')||url.pathname.startsWith('/api/policies/')||url.pathname.startsWith('/api/certificates/')||url.pathname==='/api/account-security')return Response.json({},{status:401,headers:privateHeaders});
  throw Error('Unexpected test target');
 }));
});
afterEach(()=>vi.unstubAllGlobals());
describe('live HTTP probe semantics',()=>{
 it('covers every named HTTP check with its correct positive control',async()=>{await httpProbes({runId,users,companyIds:['company-a','company-b'],check});expect([...states.keys()].sort()).toEqual(httpCheckNames.map(x=>x.id).sort());expect([...states.values()].every(s=>s==='passed')).toBe(true);expect(revoked).toBe(true);});
 it('records a real cross-company leak as failed',async()=>{foreignLeak=true;await httpProbes({runId,users,companyIds:['company-a','company-b'],check});expect(states.get('asset_enrolled')).toBe('passed');expect(states.get('asset_foreign')).toBe('failed');});
 it('does not call a missing positive control proof of isolation',async()=>{positive=false;await httpProbes({runId,users,companyIds:['company-a','company-b'],check});expect(states.get('asset_enrolled')).toBe('failed');expect(states.has('asset_foreign')).toBe(false);expect(states.has('asset_revoked')).toBe(false);});
});
