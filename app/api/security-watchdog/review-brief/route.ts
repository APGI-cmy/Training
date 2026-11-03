import {watchdogAccess,checkWatchdogScope,WatchdogError,watchdogResponseError} from '@/server/security-watchdog/access';
import {securityReviewBrief} from '@/lib/watchdog-review-brief';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{
  const access=await watchdogAccess(),value=new URL(request.url).searchParams.get('scope');
  const scope=value==='platform'?null:value??(access.principal?null:access.ownedCompanyIds[0]);
  if(scope===undefined)throw new WatchdogError('No active company scope is available.');
  checkWatchdogScope(access,scope);
  const text='APGI SECURITY WATCHDOG — INDEPENDENT SECURITY REVIEW BRIEF\n\n'+securityReviewBrief(scope===null?'APGI Training V2 staging — whole platform':'Your selected company only').map(s=>s.title+'\n'+s.text.map(t=>'- '+t).join('\n')).join('\n\n');
  return new Response(text,{headers:{'content-type':'text/plain; charset=utf-8','content-disposition':'attachment; filename="APGI-independent-security-review-brief.txt"','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
 }catch(error){return watchdogResponseError(error);}
}
