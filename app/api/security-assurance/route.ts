import {securityAssurance} from '@/server/security-watchdog/assurance';
import {watchdogResponseError} from '@/server/security-watchdog/access';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{return Response.json(await securityAssurance(new URL(request.url).searchParams.get('scope')??undefined),{headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff','vary':'Cookie'}});}
 catch(error){return watchdogResponseError(error);}
}
