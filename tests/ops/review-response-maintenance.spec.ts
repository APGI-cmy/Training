import {it,expect} from 'vitest';
import {writeFileSync} from 'node:fs';
import {dailyReviewMail} from '@/server/services/course-reviews';
// Deliberately excluded from ordinary release tests. This executes the real V2
// hourly worker and can send queued emails; run only for explicitly authorized ops.
it.skipIf(process.env.APGI_RUN_REVIEW_MAINTENANCE!=='1')('runs the authorized V2 review response worker',async()=>{
 expect(process.env.ALP_ENVIRONMENT).toBe('v2-staging');expect(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname).toBe('eaaqgtdpvbxdgjxphjie.supabase.co');
 const result=await dailyReviewMail();expect(result.processed).toBeGreaterThanOrEqual(0);
 if(process.env.APGI_REVIEW_OPS_OUTPUT)writeFileSync(process.env.APGI_REVIEW_OPS_OUTPUT,JSON.stringify(result,null,2));
});
