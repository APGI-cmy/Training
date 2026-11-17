import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFile} from 'node:fs/promises';
import {brandedEmail} from '@/server/services/email/send-course-invitation';
import {CertificatePreview} from '@/components/certificates/CertificatePreview';
import {currentCertificateHeader,type CertificateSnapshot} from '@/lib/certificates/designs';
import {visibleBrandFooter} from '@/lib/white-label';
const mocks=vi.hoisted(()=>({rest:vi.fn()}));
vi.mock('@/server/supabase/admin-rest',()=>({adminRest:mocks.rest}));
import {watermarkSettings} from '@/server/services/watermark-images';
describe('White-label learner assets',()=>{
 it('uses NKS identity and keeps the privacy link without provider advertising',()=>{const html=brandedEmail({brand:'NKS Capital',logo:'https://example.test/nks.png',color:'#000722',title:'Your course invitation',description:'Welcome to Tiger training.',link:'https://training.nkscapital.co.za/invitations/fixture',button:'Open invitation',footer:'Contact your training administrator.'});expect(html).toContain('NKS Capital');expect(html).toContain('https://legal.apgi.app/training/privacy');expect(html).not.toMatch(/Hosted by APGI|APGI Training|apgi-logo/);});
 it('removes inherited provider text from a partner footer only',()=>{expect(visibleBrandFooter('NKS Capital','Hosted by APGI')).toBe('');expect(visibleBrandFooter('APGI','Hosted by APGI')).toBe('Hosted by APGI');});
 it('hides attribution on new sample certificates and preserves earlier snapshots',()=>{const old:CertificateSnapshot={name:'Learner',course:'Tiger',organisation:'NKS Capital',templateId:'classic',primary:'#000722',secondary:'#021639',accent:'#cbb255',logoPath:'nks.png',test:false,statement:'Completed'};const legacy=renderToStaticMarkup(<CertificatePreview snapshot={old} logoUrl="https://example.test/nks.png"/>);const current=renderToStaticMarkup(<CertificatePreview snapshot={{...old,...currentCertificateHeader()}} logoUrl="https://example.test/nks.png"/>);expect(legacy).toContain('Hosted by APGI');expect(current).not.toContain('APGI');expect(current).toContain('TRAINING-PREVIEW');});
 it('enables the exact supplied PNG even if the form was still set to None',async()=>{mocks.rest.mockResolvedValue(new Response('{}',{status:200}));const bytes=await readFile('C:/Users/Johan/OneDrive/Documents/22. NKS Capital/Branding/Watermark.png');const f=new FormData();f.set('mark_kind','none');f.set('mark_opacity','25');f.set('mark_image',new File([bytes],'Watermark.png',{type:'image/png'}));const w=await watermarkSettings(f,'mark','ebe89fb6-23fa-4fb1-9bfb-c525795fa3c7',{kind:'none',text:'',opacity:.07},true);expect(w.kind).toBe('image');expect(w.imagePath).toMatch(/^organisations\/ebe89fb6/);expect(mocks.rest.mock.calls[0][1].body.byteLength).toBeLessThanOrEqual(2097152);});
});
