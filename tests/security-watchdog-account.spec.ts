import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
vi.mock('@/server/security/auth-budget',()=>({claimSecurityBudget:vi.fn(async()=>true)}));
vi.mock('@/server/security-watchdog/events',()=>({recordSecurityEvent:vi.fn()}));
vi.mock('@/server/auth/session',()=>({getCurrentSession:vi.fn(),storeVerifiedSession:vi.fn()}));
vi.mock('@/server/environment-isolation',()=>({assertStagingIsolation:vi.fn(),STAGING_DATABASE_REF:'v2-test'}));
import {getCurrentSession,storeVerifiedSession} from '@/server/auth/session';
import {accountMfaOperation,securityAccount} from '@/server/security-watchdog/account-security';
const id='ad673bd3-ff61-46b6-9941-090675220964',other='bd673bd3-ff61-46b6-9941-090675220964';
beforeEach(()=>{vi.resetAllMocks();vi.mocked(getCurrentSession).mockResolvedValue({accessToken:'verified-provider-token',user:{id:'owner',email_confirmed_at:'yes'}});});
afterEach(()=>vi.unstubAllGlobals());
describe('Private authenticator ownership',()=>{
 it('does not expose enrolment data without a verified account',async()=>{vi.mocked(getCurrentSession).mockResolvedValue(null);await expect(securityAccount()).rejects.toMatchObject({status:401});});
 it('rejects a factor owned by someone else before sending an OTP',async()=>{const f=vi.fn(async()=>Response.json({id:'owner',factors:[{id,status:'verified',factor_type:'totp'}]}));vi.stubGlobal('fetch',f);await expect(accountMfaOperation('verify',other,'123456')).rejects.toMatchObject({status:404});expect(f).toHaveBeenCalledOnce();expect(storeVerifiedSession).not.toHaveBeenCalled();});
 it('does not let an AAL1 session remove an existing verified authenticator',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>Response.json({id:'owner',factors:[{id,status:'verified',factor_type:'totp'}]})));await expect(accountMfaOperation('cancel',id,null)).rejects.toThrow(/cannot be removed/);});
 it('stores upgraded credentials only for the same verified account',async()=>{const f=vi.fn().mockResolvedValueOnce(Response.json({id:'owner',factors:[{id,status:'verified',factor_type:'totp'}]})).mockResolvedValueOnce(Response.json({id:'challenge'})).mockResolvedValueOnce(Response.json({access_token:'wrong-owner-token',user:{id:'foreign'}}));vi.stubGlobal('fetch',f);await expect(accountMfaOperation('verify',id,'123456')).rejects.toThrow(/identity did not match/);expect(storeVerifiedSession).not.toHaveBeenCalled();});
});
