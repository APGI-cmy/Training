import {watchdogAccess,watchdogRun,watchdogResponseError,WatchdogError} from '@/server/security-watchdog/access';
import {verifyWatchdogReport} from '@/server/security-watchdog/signing';
import {watchdogPdf} from '@/server/security-watchdog/pdf';
import {watchdogDeployment} from '@/server/security-watchdog/runner';
import {reportFreshness} from '@/lib/security-watchdog';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const access=await watchdogAccess(),{id}=await params,run=await watchdogRun(access,id),format=new URL(request.url).searchParams.get('format')??'json';
  if(!['json','pdf'].includes(format))throw new WatchdogError('Choose PDF or JSON.',400);
  if(!run.payload||!run.proof)throw new WatchdogError('This security report is not ready for export.',409);
  if(!verifyWatchdogReport(run.payload,run.proof))throw new WatchdogError('Report integrity could not be verified. Export is blocked.',409);
  const freshness=reportFreshness(run,watchdogDeployment());
  const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff','content-disposition':`attachment; filename="watchdog-${id}.${format}"`};
  if(format==='pdf')return new Response(Buffer.from(await watchdogPdf(run.payload,run.proof,freshness)),{headers:{...headers,'content-type':'application/pdf'}});
  return Response.json({payload:run.payload,proof:run.proof,export:{exportedAt:new Date().toISOString(),signatureVerified:true,freshness}},{headers});
 }catch(error){return watchdogResponseError(error);}
}
