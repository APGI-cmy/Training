"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth/session";
import { requireAdmin } from "@/lib/auth/require-admin";
import { adminRest } from "@/server/supabase/admin-rest";
import { getCourseBySlug } from "@/lib/courses";
import { isDesign, safeColor, type CertificateSnapshot, type CertificateRecord } from "@/lib/certificates/designs";
import { signCertificate } from "@/server/certificates/authentication";
import { myCertificateState } from "@/server/certificates/records";

export async function issueMyCertificate(form: FormData) {
  const session=await requireSession(); const course=getCourseBySlug(String(form.get("courseSlug")??""));
  if (!course || !session.user.email_confirmed_at) throw new Error("A verified enrolled account is required.");
  const state=await myCertificateState(course.id);
  if (state.certificate?.status==='revoked') throw new Error("This certificate has been revoked. Contact your administrator.");
  if (state.certificate) redirect(`/learn/${course.slug}/certificate`);
  if (!state.eligible) throw new Error("Complete the required learning and assessment before issuing your certificate.");
  const [p,e]=await Promise.all([
    adminRest(`/rest/v1/profiles?user_id=eq.${session.user.id}&select=certificate_name&limit=1`),
    adminRest(`/rest/v1/course_enrolments?user_id=eq.${session.user.id}&course_id=eq.${course.id}&status=eq.enrolled&select=organisation_id&limit=1`)
  ]);
  const profile=p.ok?(await p.json())[0]:null; const enrolment=e.ok?(await e.json())[0]:null;
  if (!profile?.certificate_name || profile.certificate_name.length>160 || !enrolment?.organisation_id) throw new Error("Check your certificate name and enrolled organisation.");
  const o=await adminRest(`/rest/v1/organisations?id=eq.${enrolment.organisation_id}&is_active=eq.true&select=name,slug,logo_path,primary_color,secondary_color,accent_color,certificate_template_id&limit=1`);
  const org=o.ok?(await o.json())[0]:null; if(!org) throw new Error("The enrolled organisation is unavailable.");
  const n=await adminRest("/rest/v1/rpc/v2_next_certificate_number",{method:"POST",body:"{}"});
  if(!n.ok) throw new Error("Certificate numbering is unavailable.");
  const number=await n.json() as string;
  const snapshot: CertificateSnapshot={name:profile.certificate_name,course:course.title,organisation:org.name,templateId:isDesign(org.certificate_template_id)?org.certificate_template_id:'classic',primary:safeColor(org.primary_color),secondary:safeColor(org.secondary_color),accent:safeColor(org.accent_color,'#9c7b30'),logoPath:org.logo_path??null,test:process.env.ALP_ENVIRONMENT==='v2-staging',statement:course.id==='scannex-training-programme'?'Required learning and approved Scannex assessment completed.':'Required learning activities completed.'};
  const row: Omit<CertificateRecord,'signature'|'status'>={id:randomUUID(),certificate_number:number,user_id:session.user.id,course_id:course.id,organisation_id:enrolment.organisation_id,issued_at:new Date().toISOString(),snapshot};
  const signature=signCertificate(row);
  const created=await adminRest("/rest/v1/issued_certificates",{method:"POST",body:JSON.stringify({...row,signature})});
  if(!created.ok) {
    const retry=await myCertificateState(course.id);
    if(!retry.certificate || retry.certificate.status==='revoked') throw new Error("Certificate issuance could not be completed. No valid certificate was issued.");
  }
  revalidatePath(`/learn/${course.slug}/certificate`); redirect(`/learn/${course.slug}/certificate`);
}
export async function saveCertificateDesign(form: FormData) {
  await requireAdmin(); const orgId=String(form.get('organisationId')??''); const id=String(form.get('templateId')??'');
  if(!isDesign(id)) throw new Error("Choose one of the ten certificate designs.");
  const r=await adminRest(`/rest/v1/organisations?id=eq.${encodeURIComponent(orgId)}`,{method:'PATCH',body:JSON.stringify({certificate_template_id:id})});
  if(!r.ok) throw new Error("The certificate design could not be saved."); revalidatePath('/admin/certificates');
}
export async function revokeCertificate(form: FormData) {
  await requireAdmin(); const id=String(form.get('id')??''); const reason=String(form.get('reason')??'').trim();
  if(!reason || reason.length>500) throw new Error("Enter a revocation reason of up to 500 characters.");
  const r=await adminRest(`/rest/v1/issued_certificates?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({status:'revoked',revoked_at:new Date().toISOString(),revocation_reason:reason})});
  if(!r.ok) throw new Error("The certificate could not be revoked."); revalidatePath('/admin/certificates'); revalidatePath(`/verify-certificate/${id}`);
}
