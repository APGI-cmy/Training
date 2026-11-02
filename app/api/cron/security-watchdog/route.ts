import {timingSafeEqual} from 'node:crypto';
import {cleanInterruptedWatchdogRuns} from '@/server/security-watchdog/runner';
import {runWatchdogSchedule} from '@/server/security-watchdog/scheduler';
export const maxDuration=300;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET,actual=Buffer.from(request.headers.get('authorization')??''),expected=Buffer.from(`Bearer ${secret??''}`);
 if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected))return Response.json({error:'Unauthorized'},{status:401});
 try{const cleanup=await cleanInterruptedWatchdogRuns();return Response.json({...cleanup,...await runWatchdogSchedule()},{headers:{'cache-control':'no-store'}});}
 catch{return Response.json({error:'Watchdog cleanup will retry.'},{status:503,headers:{'cache-control':'no-store'}});}
}
