import {authenticatedExchangePeer,exportCourseShares,exchangeReports,syncCourseShares} from '@/server/services/course-exchange';
import {PLATFORM_RELEASE} from '@/lib/platform-release';
export const dynamic='force-dynamic';
export const maxDuration=300;
export async function GET(request:Request){
 let peer;try{peer=await authenticatedExchangePeer(request);}catch{return Response.json({error:'Verified registered deployment required'},{status:401});}
 try{const params=new URL(request.url).searchParams;if(params.get('reports')==='1')return Response.json({version:PLATFORM_RELEASE.version,...await exchangeReports(peer)},{headers:{'cache-control':'no-store'}});const shares=await exportCourseShares(params.get('recipient')??'',peer);return Response.json({version:PLATFORM_RELEASE.version,shares},{headers:{'cache-control':'no-store'}});}catch{return Response.json({error:'Course shelf unavailable for this deployment'},{status:403});}
}
export async function POST(request:Request){
 try{await authenticatedExchangePeer(request);}catch{return Response.json({error:'Verified registered deployment required'},{status:401});}
 try{
  const input=await request.json();
  if(input.action!=='refresh'||input.version!==PLATFORM_RELEASE.version)return Response.json({error:'Common release refresh required'},{status:409});
  const result=await syncCourseShares();
  return Response.json({...result,refreshed:true},{headers:{'cache-control':'no-store'}});
 }catch{return Response.json({error:'Course refresh awaits retry'},{status:503});}
}
