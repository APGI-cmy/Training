import {requireReview} from '@/server/services/course-reviews';
import {reviewFeedbackReport} from '@/lib/review-feedback-report';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {round,email,session}=await requireReview(id);
 return new Response(reviewFeedbackReport(round,email,session.user.id),{headers:{'content-type':'text/html; charset=utf-8','content-disposition':`attachment; filename="course-review-${round.id}-revision-${round.revision}.html"`,'cache-control':'private, no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"}});
}
