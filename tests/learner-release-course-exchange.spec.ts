import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
const m=vi.hoisted(()=>({verify:vi.fn(),token:vi.fn(),rows:vi.fn(),rpc:vi.fn(),fetch:vi.fn(),mail:vi.fn()}));
vi.mock('@vercel/oidc',()=>({verifyVercelOidcToken:m.verify,getVercelOidcToken:m.token}));
vi.mock('@/server/services/company-structure',()=>({rows:m.rows}));
vi.mock('@/server/services/course-distribution',()=>({distributionRpc:m.rpc}));
vi.mock('@/server/security/provider-fetch',()=>({providerFetch:m.fetch}));
vi.mock('@/server/services/notification-mail',()=>({flushNotificationMail:m.mail}));
import {authenticatedExchangePeer,exportCourseShares,syncCourseShares,refreshRegisteredCourseShares} from '@/server/services/course-exchange';
import {POST} from '../app/api/course-exchange/route';
import {PLATFORM_RELEASE,PLATFORM_TEAM} from '@/lib/platform-release';
const [apgi,nks]=PLATFORM_RELEASE.targets;
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('VERCEL_PROJECT_ID',apgi.project);m.rows.mockResolvedValue([]);m.token.mockResolvedValue('eyJsynthetic.token.signature');m.mail.mockResolvedValue({configured:true,accepted:0,failed:0});});
afterEach(()=>vi.unstubAllEnvs());
describe('Scoped deployment identity and sharing exchange',()=>{
 it('requires a signed, production, project and team bound OIDC identity',async()=>{
  await expect(authenticatedExchangePeer(new Request('https://example.test'))).rejects.toThrow('identity');expect(m.verify).not.toHaveBeenCalled();
  m.verify.mockResolvedValue({payload:{project_id:nks.project}});
  expect((await authenticatedExchangePeer(new Request('https://example.test',{headers:{authorization:'Bearer eyJsynthetic.token.signature'}}))).project).toBe(nks.project);
  expect(m.verify.mock.calls[0][1]).toMatchObject({ownerId:PLATFORM_TEAM.id,environment:'production',audience:`https://vercel.com/${PLATFORM_TEAM.slug}`});
 });
 it('rejects another project or a token from its own project',async()=>{for(const id of ['unregistered',apgi.project]){m.verify.mockResolvedValue({payload:{project_id:id}});await expect(authenticatedExchangePeer(new Request('https://example.test',{headers:{authorization:'Bearer eyJsynthetic.token.signature'}}))).rejects.toThrow('registered platform');}});
 it('does not let NKS request another recipient shelf',async()=>{await expect(exportCourseShares('mediation-zone',nks)).rejects.toThrow('another platform');expect(m.rows).not.toHaveBeenCalled();});
 it('stops importing on release drift before any database write',async()=>{vi.stubEnv('VERCEL_PROJECT_ID',nks.project);m.rows.mockResolvedValue([{id:'recipient',slug:'nks-capital'}]);m.fetch.mockResolvedValue(Response.json({version:'older',shares:[]}));await expect(syncCourseShares()).rejects.toThrow('version drift');expect(m.rpc).not.toHaveBeenCalled();});
 it('never treats an exchange HTTP failure as an empty, successful shelf',async()=>{vi.stubEnv('VERCEL_PROJECT_ID',nks.project);m.rows.mockResolvedValue([{id:'recipient',slug:'nks-capital'}]);m.fetch.mockResolvedValue(new Response('',{status:401}));await expect(syncCourseShares()).rejects.toThrow('retry');expect(m.rpc).not.toHaveBeenCalled();});
 it('does not import anything for an unsigned refresh or a different release',async()=>{
  const make=(version:string,signed=false)=>new Request('https://example.test/api/course-exchange',{method:'POST',headers:{'content-type':'application/json',...(signed?{authorization:'Bearer eyJsynthetic.token.signature'}:{})},body:JSON.stringify({action:'refresh',version})});
  expect((await POST(make(PLATFORM_RELEASE.version))).status).toBe(401);
  m.verify.mockResolvedValue({payload:{project_id:nks.project}});
  expect((await POST(make('different',true))).status).toBe(409);
  expect(m.rows).not.toHaveBeenCalled();expect(m.rpc).not.toHaveBeenCalled();expect(m.mail).not.toHaveBeenCalled();
 });
 it('a verified recipient refresh imports its native shelf without recursively refreshing peers',async()=>{
  vi.stubEnv('VERCEL_PROJECT_ID',nks.project);m.verify.mockResolvedValue({payload:{project_id:apgi.project}});
  m.rows.mockImplementation(async(path:string)=>path.includes('/organisations?')?[{id:'recipient',slug:'nks-capital'}]:[]);
  const share={source_key:'source:share',course_id:'vpshr-level-0'};
  m.fetch.mockResolvedValueOnce(Response.json({version:PLATFORM_RELEASE.version,shares:[share]})).mockResolvedValueOnce(Response.json({version:PLATFORM_RELEASE.version,receipts:[],alerts:[]}));
  const response=await POST(new Request('https://example.test/api/course-exchange',{method:'POST',headers:{authorization:'Bearer eyJsynthetic.token.signature','content-type':'application/json'},body:JSON.stringify({action:'refresh',version:PLATFORM_RELEASE.version})}));
  expect(response.status).toBe(200);expect(await response.json()).toMatchObject({refreshed:true,imported:1});
  expect(m.rpc).toHaveBeenCalledWith('v6_import_distribution',{p_project:apgi.project,p_recipient:'recipient',p_share:share});
  expect(m.fetch.mock.calls.every(([,init])=>!init.method)).toBe(true);
  expect(m.mail).toHaveBeenCalledExactlyOnceWith('distribution');
 });
 it('the central scheduler checks the receiving deployment result, instead of relying on its mail scheduler',async()=>{
  m.fetch.mockResolvedValueOnce(Response.json({version:PLATFORM_RELEASE.version,receipts:[],alerts:[]})).mockResolvedValueOnce(Response.json({version:PLATFORM_RELEASE.version,refreshed:true}));
  expect(await refreshRegisteredCourseShares()).toMatchObject({peersRefreshed:1});
  expect(m.fetch.mock.calls[1]).toEqual([`${nks.origin}/api/course-exchange`,expect.objectContaining({method:'POST',body:JSON.stringify({action:'refresh',version:PLATFORM_RELEASE.version})})]);
  m.fetch.mockResolvedValueOnce(Response.json({version:PLATFORM_RELEASE.version,receipts:[],alerts:[]})).mockResolvedValueOnce(new Response('',{status:503}));
  await expect(refreshRegisteredCourseShares()).rejects.toThrow('retry');
 });
 it('reports sharing email failure as retryable while keeping the refresh scope narrow',async()=>{
  m.verify.mockResolvedValue({payload:{project_id:nks.project}});
  m.fetch.mockResolvedValue(Response.json({version:PLATFORM_RELEASE.version,receipts:[],alerts:[]}));
  m.mail.mockResolvedValue({accepted:0,failed:1});
  const response=await POST(new Request('https://example.test/api/course-exchange',{method:'POST',headers:{authorization:'Bearer eyJsynthetic.token.signature','content-type':'application/json'},body:JSON.stringify({action:'refresh',version:PLATFORM_RELEASE.version})}));
  expect(response.status).toBe(503);expect(m.mail).toHaveBeenCalledExactlyOnceWith('distribution');
 });
});
