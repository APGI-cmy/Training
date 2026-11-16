import 'server-only';
import {getCurrentSession,getUserRoles,type AlpSession} from '@/server/auth/session';
import {isPlatformPrincipal} from '@/server/services/platform-principals';
import {ownMemberships,rows} from '@/server/services/company-structure';
import {permittedWatchdogScope,type WatchdogRun} from '@/lib/security-watchdog';
import {adminRest} from '@/server/supabase/admin-rest';
export class WatchdogError extends Error{constructor(message:string,public status=403){super(message);}}
export function watchdogId(id:string){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw new WatchdogError('Invalid request.',400);return id;}
export async function watchdogAccess(verifiedSession?:AlpSession){
 const session=verifiedSession??await getCurrentSession();
 if(!session)throw new WatchdogError('Sign in to open Security Watchdog.',401);
 if(!session.user.email_confirmed_at)throw new WatchdogError('Verify your email before using Security Watchdog.');
 const [principal,owners,roles]=await Promise.all([isPlatformPrincipal(session),ownMemberships(session,true),getUserRoles(session.accessToken)]);
 if(!principal&&!owners.length&&!roles.includes('admin'))throw new WatchdogError('Security Watchdog is available to company administrators.');
 return {session,principal,ownedCompanyIds:owners.map(m=>m.organisation_id)};
}
export type WatchdogAccess={principal:boolean;ownedCompanyIds:string[]}&({session:AlpSession;actorId?:never;automatic?:false}|{actorId:string;automatic:true;session?:never});
export function watchdogActorId(access:WatchdogAccess){return access.session?access.session.user.id:access.actorId;}
export function checkWatchdogScope(access:WatchdogAccess,scope:string|null){
 if(scope!==null)watchdogId(scope);
 if(!permittedWatchdogScope(access.principal,access.ownedCompanyIds,scope))throw new WatchdogError('This security scope is unavailable.');
}
export async function watchdogCompanies(access:WatchdogAccess){
 if(!access.principal&&!access.ownedCompanyIds.length)return [];
 return rows<{id:string;name:string}>(`/rest/v1/organisations?select=id,name&is_active=eq.true&slug=not.like.watchdog-*&order=name.asc${access.principal?'':`&id=in.(${access.ownedCompanyIds.join(',')})`}`);
}
export const watchdogRunFields='id,company_id,actor_id,state,created_at,finished_at,deployment,payload,proof,fixtures_cleaned';
export async function watchdogRun(access:WatchdogAccess,id:string){
 watchdogId(id);const run=(await rows<WatchdogRun>(`/rest/v1/v2_watchdog_runs?id=eq.${id}&select=${watchdogRunFields}&limit=1`))[0];
 if(!run||!permittedWatchdogScope(access.principal,access.ownedCompanyIds,run.company_id))throw new WatchdogError('This report is unavailable.',404);
 const current=await adminRest('/rest/v1/rpc/v2_watchdog_allowed',{method:'POST',body:JSON.stringify({p_actor:watchdogActorId(access),p_company:run.company_id})});
 if(!current.ok||(await current.json())!==true)throw new WatchdogError('This report is unavailable.',404);
 return run;
}
export function requireSameOrigin(request:Request){
 const origin=request.headers.get('origin');
 if(!origin||origin!==new URL(request.url).origin)throw new WatchdogError('Open Watchdog on this platform before starting a request.');
}
export function watchdogResponseError(error:unknown){
 return Response.json({error:error instanceof WatchdogError?error.message:'The security check could not be completed. Please retry.'},{status:error instanceof WatchdogError?error.status:503,headers:{'cache-control':'private, no-store'}});
}
