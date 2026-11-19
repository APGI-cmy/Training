import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
const m=vi.hoisted(()=>({verify:vi.fn(),token:vi.fn(),rows:vi.fn(),rpc:vi.fn(),fetch:vi.fn()}));
vi.mock('@vercel/oidc',()=>({verifyVercelOidcToken:m.verify,getVercelOidcToken:m.token}));
vi.mock('@/server/services/company-structure',()=>({rows:m.rows}));
vi.mock('@/server/services/course-distribution',()=>({distributionRpc:m.rpc}));
vi.mock('@/server/security/provider-fetch',()=>({providerFetch:m.fetch}));
import {authenticatedExchangePeer,exportCourseShares,syncCourseShares} from '@/server/services/course-exchange';
import {PLATFORM_RELEASE,PLATFORM_TEAM} from '@/lib/platform-release';
const [apgi,nks]=PLATFORM_RELEASE.targets;
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('VERCEL_PROJECT_ID',apgi.project);m.rows.mockResolvedValue([]);m.token.mockResolvedValue('eyJsynthetic.token.signature');});
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
});
