import 'server-only';
import {requireAdmin} from '@/lib/auth/require-admin';
import {messageRpc} from './messages';
import {productionCompanyId} from './tenant-courses';
export type PendingLearner={organisation_id:string;company:string;email:string;invited_at:string;expires_at:string;invitations:{invitationId:string;courseId:string;group:string|null;status:string;providerAccepted:boolean}[]};
export async function pendingLearners(search='',page=1){
 const {session}=await requireAdmin();
 return messageRpc<{total:number;learners:PendingLearner[]}>('v7_pending_learner_workspace',{p_actor:session.user.id,p_search:search.slice(0,200),p_offset:(Math.max(1,Math.min(Number.isFinite(page)?Math.floor(page):1,4000))-1)*25,p_company:productionCompanyId()??null});
}
