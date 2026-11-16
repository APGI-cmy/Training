import "server-only";
import type { AlpSession } from "@/server/auth/session";
import { adminRest } from "@/server/supabase/admin-rest";
import { isPlatformPrincipal } from "@/server/services/platform-principals";

export type CatalogueReview = { id:string; courseId:string; company:string; stage:string; status:"open"|"published" };
type ReviewRow = { id:string; course_id:string; status:string; document:{
  brand?:{name?:string}; participants?:{email:string;state:string}[]; workflow?:{stage?:string};
} };

// Review visibility is separate from learner availability and never grants enrolment.
export async function getCatalogueReviews(session:AlpSession, courseIds:string[]):Promise<Map<string,CatalogueReview>> {
  const reviews=new Map<string,CatalogueReview>();
  const email=session.user.email?.trim().toLowerCase();
  if(!email||!session.user.email_confirmed_at||!courseIds.length)return reviews;
  try {
    const principal=await isPlatformPrincipal(session);
    const filter=courseIds.map(id=>`"${id.replaceAll('"','\\"')}"`).join(",");
    const response=await adminRest(`/rest/v1/course_review_rounds?status=in.(open,published)&course_id=in.(${encodeURIComponent(filter)})&select=id,course_id,status,document&order=created_at.desc${principal?"":`&document->participants=cs.${encodeURIComponent(JSON.stringify([{email}]))}`}`);
    if(!response.ok)return reviews;
    for(const row of await response.json() as ReviewRow[]) {
      if(!["open","published"].includes(row.status)||!courseIds.includes(row.course_id)||reviews.has(row.course_id))continue;
      if(!principal&&!row.document.participants?.some(p=>p.email.trim().toLowerCase()===email&&p.state!=="declined"))continue;
      reviews.set(row.course_id,{id:row.id,courseId:row.course_id,company:row.document.brand?.name??"Company course",stage:row.document.workflow?.stage??"content_review",status:row.status as "open"|"published"});
    }
  } catch { /* Private review metadata stays hidden when access cannot be verified. */ }
  return reviews;
}
