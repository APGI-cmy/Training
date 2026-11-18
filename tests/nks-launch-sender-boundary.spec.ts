import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({fetch:vi.fn(),brand:vi.fn()}));
vi.mock('@/server/security/provider-fetch',()=>({providerFetch:m.fetch}));
vi.mock('@/server/services/email/recipient-brand',()=>({recipientBrand:m.brand}));
import {deliverTransactionalEmail} from '@/server/services/email/transactional-delivery';
const company='ebe89fb6-23fa-4fb1-9bfb-c525795fa3c7';
const mail={to:'learner@customer.test',subject:'Your training update',html:'<p>Your course progress is saved.</p>',text:'Your course progress is saved.',idempotencyKey:'fixture-only',tracking:false as const};
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('ALP_ENVIRONMENT','training-production');vi.stubEnv('ALP_DEFAULT_ORGANISATION_ID',company);vi.stubEnv('ALP_EMAIL_MODE','transactional');vi.stubEnv('RESEND_API_KEY','fixture-only');vi.stubEnv('EMAIL_FROM','APGI <fallback@apginc.ca>');vi.stubEnv('NEXT_PUBLIC_APP_URL','https://nks-capital-training.vercel.app');m.brand.mockResolvedValue({name:'NKS Capital',organisationId:company,from:'no-reply@nkscapital.co.za',verified:true,logo:'https://nks.example/logo.png'});m.fetch.mockResolvedValue(Response.json({id:'fixture-provider'}));});
afterEach(()=>vi.unstubAllEnvs());
describe('Production sender isolation',()=>{
 it('uses the verified company sender and logo for legacy unbranded message jobs',async()=>{expect((await deliverTransactionalEmail(mail)).ok).toBe(true);const payload=JSON.parse(m.fetch.mock.calls[0][1].body);expect(payload.from).toBe('NKS Capital <no-reply@nkscapital.co.za>');expect(payload.html).toContain('https://nks.example/logo.png');expect(payload.html).not.toMatch(/APGI|apgi-logo/);});
 it('never uses the configured APGI fallback when the NKS sender is unverified',async()=>{m.brand.mockResolvedValue({name:'NKS Capital',verified:false});expect((await deliverTransactionalEmail(mail)).ok).toBe(false);expect(m.fetch).not.toHaveBeenCalled();});
 it('does not resend a saved APGI-branded template on the partner site',async()=>{expect((await deliverTransactionalEmail({...mail,html:'<body><h1>APGI Training</h1></body>'})).ok).toBe(false);expect(m.fetch).not.toHaveBeenCalled();});
 it('continues to hold all mail while DNS is pending',async()=>{vi.stubEnv('ALP_EMAIL_MODE','disabled');expect((await deliverTransactionalEmail(mail)).ok).toBe(false);expect(m.fetch).not.toHaveBeenCalled();expect(m.brand).not.toHaveBeenCalled();});
});
