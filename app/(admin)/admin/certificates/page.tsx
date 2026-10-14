import { requireAdmin } from "@/lib/auth/require-admin";
import { getOrganisationsForAdmin } from "@/server/services/organisations/get-organisations";
import { adminRest } from "@/server/supabase/admin-rest";
import { getSupabaseRestUrl } from "@/server/auth/session";
import { certificateDesigns, type CertificateSnapshot, type CertificateRecord } from "@/lib/certificates/designs";
import { CertificatePreview } from "@/components/certificates/CertificatePreview";
import { saveCertificateDesign, revokeCertificate } from "@/server/actions/certificates";
export default async function CertificateDesigns({searchParams}:{searchParams:Promise<{organisationId?:string}>}){
  await requireAdmin();
  const params=await searchParams; const organisations=await getOrganisationsForAdmin();
  const org=organisations.find(o=>o.id===params.organisationId) ?? organisations[0];
  const settings=org?await adminRest(`/rest/v1/organisations?id=eq.${org.id}&select=logo_path,certificate_template_id&limit=1`):null;
  const saved=settings?.ok?(await settings.json())[0]:null;
  const result=await adminRest('/rest/v1/issued_certificates?select=*&order=issued_at.desc&limit=100');
  if(!result.ok)throw new Error('Certificate records are unavailable.');
  const issued=await result.json() as CertificateRecord[];
  return <main className="admin-page"><h1>Certificate designs</h1><p>Choose one of ten designs for each organisation. The enrolled organisation's name, logo and colours are captured when a certificate is issued. Every design includes Hosted by APGI, a unique number and a verification code.</p>
    <form className="admin-form-card" action="/admin/certificates"><label>Preview organisation<select name="organisationId" defaultValue={org?.id}>{organisations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label><button className="secondary-button">Show organisation designs</button></form>
    {org ? <div className="certificate-gallery">{certificateDesigns.map(d=>{
      const s:CertificateSnapshot={name:'Sample Learner',course:'Scannex Training Programme',organisation:org.name,templateId:d.id,primary:org.primaryColor,secondary:org.secondaryColor,accent:org.accentColor,logoPath:saved?.logo_path??null,test:true,statement:'Required learning and approved assessment completed.'};
      const logo=s.logoPath?getSupabaseRestUrl(`/storage/v1/object/public/alp-branding-assets/${s.logoPath}`):org.slug==='apgi'?'/branding/apgi-logo.png':null;
      return <article className="admin-form-card" key={d.id}><h2>{d.name}{saved?.certificate_template_id===d.id?' · Selected':''}</h2><p>{d.description}</p><CertificatePreview snapshot={s} logoUrl={logo} /><form action={saveCertificateDesign}><input type="hidden" name="organisationId" value={org.id}/><input type="hidden" name="templateId" value={d.id}/><button className="secondary-button">Use this design for {org.name}</button></form></article>;
    })}</div> : <p>Create an organisation first.</p>}
    <section className="directory-card"><h2>Issued certificates</h2><p>Latest 100 records. Reissuing the same learner's course returns its existing number.</p>{issued.length?issued.map(c=><article className="draft-summary" key={c.id}><strong>{c.certificate_number} · {c.snapshot.name}</strong><span>{c.snapshot.course} · {c.snapshot.organisation} · {c.status}</span><a href={`/verify-certificate/${c.id}`}>Verify</a>{c.status==='valid'?<form action={revokeCertificate}><input type="hidden" name="id" value={c.id}/><label>Reason for revocation<input name="reason" required maxLength={500}/></label><button className="secondary-button">Revoke certificate</button></form>:null}</article>):<p>No certificates issued yet.</p>}</section>
  </main>;
}
