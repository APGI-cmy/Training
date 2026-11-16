import {it,expect,vi} from 'vitest';
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:vi.fn()}));
vi.mock('@/server/services/company-structure',()=>({rows:vi.fn(),ownMemberships:vi.fn()}));
vi.mock('@/server/auth/session',()=>({getCurrentSession:vi.fn(),getUserRoles:vi.fn()}));
vi.mock('@/server/services/platform-principals',()=>({isPlatformPrincipal:vi.fn()}));
import {adminRest} from '@/server/supabase/admin-rest';
import {rows} from '@/server/services/company-structure';
import {watchdogDashboard,watchdogEvidence} from '@/server/security-watchdog/store';
it('blocks dashboard and evidence reads after a company is deactivated or ownership revoked',async()=>{
 const id='ad673bd3-ff61-46b6-9941-090675220964',access={session:{accessToken:'qa',user:{id,email_confirmed_at:'yes'}},principal:false,ownedCompanyIds:[id]};
 vi.mocked(adminRest).mockImplementation(async()=>Response.json(false));
 await expect(watchdogDashboard(access,id)).rejects.toMatchObject({status:403});
 await expect(watchdogEvidence(access,id)).rejects.toMatchObject({status:403});
 expect(rows).not.toHaveBeenCalled();
});
