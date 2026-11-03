import {beforeEach,describe,it,expect,vi} from 'vitest';
vi.mock('@/server/auth/session',()=>({getCurrentSession:vi.fn(),getUserRoles:vi.fn()}));
vi.mock('@/server/services/platform-principals',()=>({isPlatformPrincipal:vi.fn()}));
vi.mock('@/server/services/company-structure',()=>({ownMemberships:vi.fn(),rows:vi.fn()}));
import {getCurrentSession,getUserRoles} from '@/server/auth/session';
import {isPlatformPrincipal} from '@/server/services/platform-principals';
import {ownMemberships} from '@/server/services/company-structure';
import {GET} from '../app/api/security-watchdog/review-brief/route';
const own='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
beforeEach(()=>{vi.resetAllMocks();vi.mocked(getCurrentSession).mockResolvedValue({accessToken:'fixture',user:{id:own,email_confirmed_at:'yes'}});vi.mocked(getUserRoles).mockResolvedValue([]);vi.mocked(isPlatformPrincipal).mockResolvedValue(false);vi.mocked(ownMemberships).mockResolvedValue([{organisation_id:own,membership_role:'owner'}]);});
describe('independent security brief access',()=>{
 it('requires a verified signed-in account',async()=>{vi.mocked(getCurrentSession).mockResolvedValue(null);expect((await GET(new Request('https://example.invalid/api/security-watchdog/review-brief'))).status).toBe(401);});
 it('denies whole-platform and other-company requests to a company owner',async()=>{for(const scope of ['platform',other])expect((await GET(new Request('https://example.invalid/api/security-watchdog/review-brief?scope='+scope))).status).toBe(403);});
 it('returns a private company-scoped brief without claiming an independent review happened',async()=>{const r=await GET(new Request('https://example.invalid/api/security-watchdog/review-brief?scope='+own));expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toContain('no-store');const t=await r.text();expect(t).toContain('Your selected company only');expect(t).toContain('not a completed review');expect(t).not.toContain('Scope: APGI Training V2 staging — whole platform');});
 it('allows an authorised principal to prepare the full-platform brief',async()=>{vi.mocked(isPlatformPrincipal).mockResolvedValue(true);const r=await GET(new Request('https://example.invalid/api/security-watchdog/review-brief?scope=platform'));expect(r.status).toBe(200);expect(await r.text()).toContain('Scope: APGI Training V2 staging — whole platform');});
});
