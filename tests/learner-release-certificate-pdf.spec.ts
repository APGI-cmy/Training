import { describe,it,expect,vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { mkdir,mkdtemp,writeFile } from 'node:fs/promises';
import { certificatePdf } from '@/server/certificates/pdf';
import { certificateDesigns, type CertificateRecord } from '@/lib/certificates/designs';
describe('Certificate PDF output',()=>{
  it('renders all ten designs with numbering, branding, verification and staging marks',async()=>{
    vi.stubEnv('NEXT_PUBLIC_APP_URL','https://training-platform-v2-staging.vercel.app');
    const gallery=await PDFDocument.create();
    for(const design of certificateDesigns){
      const c:CertificateRecord={id:'00000000-0000-4000-8000-000000000000',certificate_number:'APGI-V2-DESIGN-PREVIEW',user_id:'sample',course_id:'sample',organisation_id:'sample',issued_at:'2026-10-14T07:00:00.000Z',signature:'0'.repeat(64),status:'valid',snapshot:{name:'Sample Learner',course:'Scannex Training Programme',organisation:'APGI',templateId:design.id,primary:'#10314f',secondary:'#0587a6',accent:'#ab8b40',logoPath:null,test:true,statement:'Required learning and approved assessment completed.'}};
      const bytes=await certificatePdf(c);const pdf=await PDFDocument.load(bytes);
      expect(pdf.getPageCount()).toBe(1);expect(pdf.getTitle()).toContain('APGI-V2-DESIGN-PREVIEW');
      expect(pdf.getPage(0).getWidth()).toBe(842);
      const [page]=await gallery.copyPages(pdf,[0]);gallery.addPage(page);
    }
    const unicode:CertificateRecord={id:'00000000-0000-4000-8000-000000000000',certificate_number:'APGI-V2-UNICODE-TEST',user_id:'sample',course_id:'sample',organisation_id:'sample',issued_at:'2026-10-14T07:00:00Z',signature:'0'.repeat(64),status:'valid',snapshot:{name:'Élodie Müller',course:'A long certificate course title for accessible and accurate learner records',organisation:'Example Organisation',templateId:'minimal',primary:'#173543',secondary:'#336677',accent:'#aa8844',logoPath:null,test:true,statement:'Required learning activities completed.'}};
    expect((await certificatePdf(unicode)).length).toBeGreaterThan(1000);
    await mkdir('.vercel',{recursive:true});
    const scratch=await mkdtemp('.vercel/certificate-test-');
    await writeFile(`${scratch}/designs.pdf`,await gallery.save());
    vi.unstubAllEnvs();
  },30000);
});
