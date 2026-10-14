import "server-only";
import { requireSession } from "@/server/auth/session";
import { adminRest } from "@/server/supabase/admin-rest";
import type { CertificateRecord } from "@/lib/certificates/designs";
export async function certificateById(id: string): Promise<CertificateRecord | null> {
  if (!/^[a-f0-9-]{36}$/i.test(id)) return null;
  const r=await adminRest(`/rest/v1/issued_certificates?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
  if (!r.ok) throw new Error("Certificate records are unavailable.");
  return (await r.json())[0] ?? null;
}
export async function myCertificateState(courseId: string) {
  const session=await requireSession();
  const [c,e]=await Promise.all([
    adminRest(`/rest/v1/issued_certificates?user_id=eq.${session.user.id}&course_id=eq.${encodeURIComponent(courseId)}&select=*&limit=1`),
    adminRest("/rest/v1/rpc/v2_certificate_eligible",{method:"POST",body:JSON.stringify({p_user:session.user.id,p_course:courseId})})
  ]);
  if (!c.ok || !e.ok) throw new Error("Certificate eligibility could not be verified.");
  return { certificate:(await c.json())[0] as CertificateRecord | undefined, eligible:(await e.json())===true };
}
