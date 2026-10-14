import { certificateById } from "@/server/certificates/records";
import { authenticCertificate } from "@/server/certificates/authentication";
export const dynamic='force-dynamic';
export default async function VerifyCertificate({params}:{params:Promise<{id:string}>}){
  const {id}=await params; const c=await certificateById(id);
  const authentic=c?authenticCertificate(c):false; const valid=authentic && c?.status==='valid';
  return <main className="content-band"><div className="content-inner auth-panel"><p className="eyebrow">APGI certificate verification</p><h1>{valid?'Certificate authenticated':c?.status==='revoked'?'Certificate revoked':'Certificate not authenticated'}</h1>
    {c && authentic ? <><p><strong>{c.snapshot.name}</strong></p><p>{c.snapshot.course}</p><p>Issued for {c.snapshot.organisation} on {new Date(c.issued_at).toLocaleDateString('en-ZA',{timeZone:'Africa/Johannesburg'})}.</p><p>Number: <strong>{c.certificate_number}</strong></p>{c.snapshot.test?<p className="form-error">TEST CERTIFICATE — NOT VALID FOR QUALIFICATION</p>:null}</> : <p>No authenticated record matches this verification code.</p>}
    <p>Hosted by APGI. The current register determines validity; an altered PDF or image does not change this record.</p>
  </div></main>;
}
