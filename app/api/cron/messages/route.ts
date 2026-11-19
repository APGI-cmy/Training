import {flushReviewRequestMail} from '@/server/services/review-requests';
import {timingSafeEqual} from "node:crypto";
import {runMessageSchedules} from "@/server/services/messages";
import {runEmailSets} from '@/server/services/email-sets';
import {flushNotificationMail} from '@/server/services/notification-mail';
import {syncCourseShares} from '@/server/services/course-exchange';
export const maxDuration=300;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET,actual=Buffer.from(request.headers.get('authorization')??''),expected=Buffer.from(`Bearer ${secret??''}`);
 if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected))return Response.json({error:'Unauthorized'},{status:401});
 // A failure in a different mail queue must not prevent notification delivery.
 let failed=false;
 const attempt=async(work:()=>Promise<object>)=>{try{return await work();}catch{failed=true;return {error:'Messages remain queued for retry.'};}};
 const courseSharing=await attempt(syncCourseShares);
 const messages=await attempt(runMessageSchedules),emailSets=await attempt(runEmailSets),notifications=await attempt(flushNotificationMail),reviewRequests=await attempt(flushReviewRequestMail);
 return Response.json({...messages,emailSets,notifications,reviewRequests,courseSharing},{status:failed?503:200,headers:{'cache-control':'no-store'}});
}
