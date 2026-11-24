import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
vi.mock('@/server/auth/session',()=>({getCurrentSession:vi.fn(),getUserRoles:vi.fn()}));
vi.mock('@/server/services/platform-principals',()=>({isPlatformPrincipal:vi.fn()}));
vi.mock('@/server/services/company-structure',()=>({ownMemberships:vi.fn(),rows:vi.fn()}));
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:vi.fn()}));
import {getCurrentSession,getUserRoles} from '@/server/auth/session';
import {isPlatformPrincipal} from '@/server/services/platform-principals';
import {ownMemberships,rows} from '@/server/services/company-structure';
import {adminRest} from '@/server/supabase/admin-rest';
import {watchdogAccess,watchdogHref,watchdogRun,requireSameOrigin,checkWatchdogScope} from '@/server/security-watchdog/access';
import {navigationGroups,primaryNavigationPaths} from '@/lib/navigation-groups';
const a='ad673bd3-ff61-46b6-9941-090675220964',b='bd673bd3-ff61-46b6-9941-090675220964';
const session={accessToken:'synthetic-qa-token',user:{id:a,email_confirmed_at:'confirmed'}};
beforeEach(()=>{vi.resetAllMocks();vi.mocked(getCurrentSession).mockResolvedValue(session);vi.mocked(getUserRoles).mockResolvedValue([]);vi.mocked(isPlatformPrincipal).mockResolvedValue(false);vi.mocked(ownMemberships).mockResolvedValue([{organisation_id:a,membership_role:'owner'}]);});
afterEach(()=>vi.unstubAllEnvs());
describe('Watchdog verified server access',()=>{
 it('rejects an unauthenticated request',async()=>{vi.mocked(getCurrentSession).mockResolvedValue(null);await expect(watchdogAccess()).rejects.toMatchObject({status:401});});
 it('requires confirmed email and a suitable role',async()=>{vi.mocked(getCurrentSession).mockResolvedValue({...session,user:{id:a}});await expect(watchdogAccess()).rejects.toMatchObject({status:403});vi.mocked(getCurrentSession).mockResolvedValue(session);vi.mocked(ownMemberships).mockResolvedValue([]);await expect(watchdogAccess()).rejects.toMatchObject({status:403});});
 it('does not treat a general admin as a platform principal',async()=>{vi.mocked(getUserRoles).mockResolvedValue(['admin']);vi.mocked(ownMemberships).mockResolvedValue([]);const access=await watchdogAccess();expect(()=>checkWatchdogScope(access,null)).toThrow();expect(()=>checkWatchdogScope(access,b)).toThrow();});
 it('limits a principal on the dedicated production app to its configured company',async()=>{
  vi.stubEnv('ALP_ENVIRONMENT','training-production');
  vi.stubEnv('ALP_DEFAULT_ORGANISATION_ID',b);
  vi.mocked(isPlatformPrincipal).mockResolvedValue(true);
  const access=await watchdogAccess();
  expect(access.principal).toBe(false);
  expect(access.ownedCompanyIds).toEqual([b]);
  expect(()=>checkWatchdogScope(access,b)).not.toThrow();
  expect(()=>checkWatchdogScope(access,null)).toThrow();
  expect(()=>checkWatchdogScope(access,a)).toThrow();
 });
 it('exposes a direct navigation link and grants reports only for an allowed scope',()=>{
  const owner={principal:false,ownedCompanyIds:[a]};
  expect(watchdogHref(owner,a)).toBe('/security-watchdog?scope='+a);
  expect(watchdogHref(owner,b)).toBe('/security-assurance');
  for(const access of [owner,{principal:false,ownedCompanyIds:[]}]){
   const href=watchdogHref(access);
   expect(primaryNavigationPaths).toContain(href);
   expect(navigationGroups([{href,label:'Security Watchdog'}])).toEqual([]);
  }
 });
 it('blocks a foreign report before returning its content',async()=>{const access=await watchdogAccess();vi.mocked(rows).mockResolvedValue([{id:a,company_id:b,payload:{private:'foreign'}}]);await expect(watchdogRun(access,a)).rejects.toMatchObject({status:404});expect(adminRest).not.toHaveBeenCalled();});
 it('checks current database permission again for a saved report',async()=>{const access=await watchdogAccess();vi.mocked(rows).mockResolvedValue([{id:a,company_id:a}]);vi.mocked(adminRest).mockResolvedValue(Response.json(false));await expect(watchdogRun(access,a)).rejects.toMatchObject({status:404});});
 it('returns an authorised report only after the fresh permission check',async()=>{const access=await watchdogAccess();vi.mocked(rows).mockResolvedValue([{id:a,company_id:a}]);vi.mocked(adminRest).mockResolvedValue(Response.json(true));expect((await watchdogRun(access,a)).id).toBe(a);});
 it('rejects malformed identifiers and cross-origin mutations',async()=>{const access=await watchdogAccess();expect(()=>checkWatchdogScope(access,'bad/filter')).toThrow();for(const origin of [null,'https://another.example'])expect(()=>requireSameOrigin(new Request('https://apgi.example/api',{headers:origin?{origin}:{}}))).toThrow();expect(()=>requireSameOrigin(new Request('https://apgi.example/api',{headers:{origin:'https://apgi.example'}}))).not.toThrow();});
});
