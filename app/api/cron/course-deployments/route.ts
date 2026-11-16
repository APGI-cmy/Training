import {timingSafeEqual} from 'node:crypto';
import {synchronizeCourseDeployments} from '@/server/services/course-deployments';
import {processReviewMail} from '@/server/services/course-reviews';
import {queueReviewResponseRequests} from '@/server/services/review-nonresponse';
import {rows} from '@/server/services/company-structure';
import type {ReviewRound} from '@/lib/course-review';
export const maxDuration=300;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET,actual=Buffer.from(request.headers.get('authorization')??''),expected=Buffer.from(`Bearer ${secret??''}`);
 if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected))return Response.json({error:'Unauthorized'},{status:401});
 try{
  const result=await synchronizeCourseDeployments();
  if(!result.confirmed||result.deferred)return Response.json(result,{status:503,headers:{'cache-control':'no-store'}});
  // Reconcile current requests promptly after saved feedback. Reuse successfully
  // sent notices and existing deadlines; never restart a notified timer.
  const rounds=await rows<ReviewRound>('/rest/v1/course_review_rounds?status=eq.open&select=*&order=created_at.asc');
  const queued=await queueReviewResponseRequests(rounds);
  if(result.registered||queued)await processReviewMail();
  return Response.json({...result,responseRequestsQueued:queued},{headers:{'cache-control':'no-store'}});
 }
 catch{return Response.json({error:'Deployment registration will retry; saved reviews are retained.'},{status:503});}
}
