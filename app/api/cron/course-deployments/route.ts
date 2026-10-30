import {timingSafeEqual} from 'node:crypto';
import {synchronizeCourseDeployments} from '@/server/services/course-deployments';
import {processReviewMail} from '@/server/services/course-reviews';
export const maxDuration=300;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET,actual=Buffer.from(request.headers.get('authorization')??''),expected=Buffer.from(`Bearer ${secret??''}`);
 if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected))return Response.json({error:'Unauthorized'},{status:401});
 try{const result=await synchronizeCourseDeployments();if(result.registered)await processReviewMail();return Response.json(result,{status:result.confirmed&&!result.deferred?200:503,headers:{'cache-control':'no-store'}});}
 catch{return Response.json({error:'Deployment registration will retry; saved reviews are retained.'},{status:503});}
}
