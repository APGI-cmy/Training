import {afterEach,expect,it,vi} from 'vitest';
import {sendPasswordRecoveryEmail} from '@/server/services/email/send-password-recovery';

const mail=vi.hoisted(()=>({brand:vi.fn(),deliver:vi.fn()}));
vi.mock('@/server/environment-isolation',()=>({usesStagingMailCapture:()=>false}));
vi.mock('@/server/services/email/recipient-brand',()=>({recipientBrand:mail.brand}));
vi.mock('@/server/services/email/transactional-delivery',()=>({
 emailConfiguration:()=>({origin:new URL('https://example.invalid')}),
 deliverTransactionalEmail:mail.deliver,
}));
afterEach(()=>vi.unstubAllEnvs());

it('sends recovery through the production company for an owner whose invitation is no longer available',async()=>{
 const company='22222222-2222-4222-8222-222222222222',email='owner@example.invalid';
 vi.stubEnv('ALP_ENVIRONMENT','training-production');
 vi.stubEnv('ALP_DEFAULT_ORGANISATION_ID',company);
 mail.brand.mockImplementation(async(_email,org)=>org===company?{
  organisationId:company,name:'NKS Capital',origin:'https://training.nkscapital.co.za',
  from:'no_reply@nkscapital.co.za',verified:true,
 }:null);
 mail.deliver.mockResolvedValue({ok:true});
 const review='/review-requests/11111111-1111-4111-8111-111111111111';
 expect(await sendPasswordRecoveryEmail(email,'sample-recovery',review)).toBe(true);
 expect(mail.deliver).toHaveBeenCalledWith(expect.objectContaining({
  to:email,subject:'Reset your NKS Capital password',
  text:expect.stringContaining('https://training.nkscapital.co.za/reset-password'),
  tracking:{category:'account_recovery',organisationId:company},
 }));
 expect(mail.deliver.mock.calls[0][0].text).toContain(encodeURIComponent(review));
});
