import {securityAccount,accountMfaOperation} from '@/server/security-watchdog/account-security';
import {requireSameOrigin,watchdogResponseError} from '@/server/security-watchdog/access';
export const dynamic='force-dynamic';
export async function GET(){try{const account=await securityAccount();return Response.json({factors:account.factors,mfaRequired:account.mfaRequired},{headers:{'cache-control':'private, no-store'}});}catch(e){return watchdogResponseError(e);}}
export async function POST(request:Request){try{requireSameOrigin(request);const body=await request.json();return Response.json(await accountMfaOperation(body.operation,body.factorId,body.code),{headers:{'cache-control':'private, no-store'}});}catch(e){return watchdogResponseError(e);}}
