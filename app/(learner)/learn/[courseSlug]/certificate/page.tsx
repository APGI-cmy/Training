import { notFound } from "next/navigation";
import { getCourseBySlug } from "@/lib/courses";
import { myCertificateState } from "@/server/certificates/records";
import { authenticCertificate } from "@/server/certificates/authentication";
import { issueMyCertificate } from "@/server/actions/certificates";
import { CertificatePreview } from "@/components/certificates/CertificatePreview";
import { getSupabaseRestUrl } from "@/server/auth/session";
export const dynamic="force-dynamic";
export default async function CertificatePage({params}:{params:Promise<{courseSlug:string}>}){
  const {courseSlug}=await params; const course=getCourseBySlug(courseSlug); if(!course)notFound();
  const state=await myCertificateState(course.id); const c=state.certificate;
  const valid=c && c.status==='valid' && authenticCertificate(c);
  const logo=c?.snapshot.logoPath?getSupabaseRestUrl(`/storage/v1/object/public/alp-branding-assets/${c.snapshot.logoPath}`):c?.snapshot.organisation==='APGI'?'/branding/apgi-logo.png':null;
  return <main className="content-band"><div className="content-inner"><p className="eyebrow">End of course</p><h1>Your certificate</h1><h2>{course.title}</h2>
    {c ? valid ? <><CertificatePreview snapshot={c.snapshot} number={c.certificate_number} date={new Date(c.issued_at).toLocaleDateString('en-ZA',{timeZone:'Africa/Johannesburg'})} logoUrl={logo} verificationUrl={`/verify-certificate/${c.id}`} /><p className="button-row"><a className="primary-button" href={`/api/certificates/${c.id}`}>Download certificate PDF</a><a className="secondary-button" href={`/verify-certificate/${c.id}`}>Verify certificate</a></p><p>Certificate number: <strong>{c.certificate_number}</strong>. This record preserves the organisation branding used at issuance.</p></> : <p role="alert">This certificate is revoked or could not be authenticated. Contact your administrator.</p>
    : state.eligible ? <section className="notice-card"><h2>You are ready to issue your certificate</h2><p>Check the certificate name in your profile. Your certificate will use the organisation associated with this enrolment.</p><form action={issueMyCertificate}><input type="hidden" name="courseSlug" value={course.slug} /><button className="primary-button">Issue my certificate</button></form></section>
    : <section className="notice-card"><h2>Complete the course requirements first</h2><p>Complete every required learning unit. For Scannex, the approved assessor must also record your summative pass and supporting practical evidence. Practice streaming and viewing a unit do not qualify you for a certificate.</p><a href={`/learn/${course.slug}`}>Return to your course</a></section>}
    <p>Certificates issued in Version 2 staging are clearly marked as tests and are not valid qualifications.</p>
  </div></main>;
}
