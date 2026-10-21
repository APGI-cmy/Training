import {timingSafeEqual} from "node:crypto";
import {runMessageSchedules} from "@/server/services/messages";
export const maxDuration=300;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET,actual=Buffer.from(request.headers.get('authorization')??''),expected=Buffer.from(`Bearer ${secret??''}`);
 if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected))return Response.json({error:'Unauthorized'},{status:401});
 try{return Response.json(await runMessageSchedules(),{headers:{'cache-control':'no-store'}});}catch{return Response.json({error:'Messages remain queued for retry.'},{status:503});}
}
