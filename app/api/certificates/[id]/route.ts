import { requireSession, getUserRoles } from "@/server/auth/session";
import { certificateById } from "@/server/certificates/records";
import { authenticCertificate } from "@/server/certificates/authentication";
import { certificatePdf } from "@/server/certificates/pdf";
export const runtime="nodejs";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const session=await requireSession(); const {id}=await params; const c=await certificateById(id);
  if(!c || (c.user_id!==session.user.id && !(await getUserRoles(session.accessToken)).includes('admin')))return new Response('Not found',{status:404});
  if(c.status!=='valid' || !authenticCertificate(c))return new Response('Certificate is not valid',{status:409});
  const bytes=await certificatePdf(c);
  return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${c.certificate_number}.pdf"`,'Cache-Control':'private, no-store'}});
}
