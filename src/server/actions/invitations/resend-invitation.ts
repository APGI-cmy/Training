"use server";
import { createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminRest } from '@/server/supabase/admin-rest';
import { getCourseBySlug } from '@/lib/courses';
import { deliverStoredInvitation } from '@/server/services/invitations/deliver-stored-invitation';
import type { CreateInvitationState } from './create-invitation';

export async function resendInvitation(_state:CreateInvitationState,form:FormData):Promise<CreateInvitationState>{
  const {session}=await requireAdmin();const id=String(form.get('invitationId')??'');
  if(!/^[0-9a-f-]{36}$/i.test(id))return {ok:false,error:'INVITATION_INVALID'};
  const found=await adminRest(`/rest/v1/course_invitations?id=eq.${id}&select=id,recipient_email,invited_role,course_id,organisation_id,expires_at,status,revoked_at,redeemed_at,token_hash,created_by&limit=1`);
  const row=found.ok?(await found.json())[0]:null;
  if(!row || row.revoked_at || row.redeemed_at || !['pending','sent'].includes(row.status) || !(new Date(row.expires_at).getTime()>Date.now()))return {ok:false,error:'INVITATION_NOT_ACTIVE'};
  const org=await adminRest(`/rest/v1/organisations?id=eq.${encodeURIComponent(row.organisation_id)}&is_active=eq.true&select=id`);
  if(!org.ok || !(await org.json()).length)return {ok:false,error:'INVITATION_ORGANISATION_INVALID'};
  const recent=await adminRest(`/rest/v1/course_invitation_events?invitation_id=eq.${id}&created_at=gt.${encodeURIComponent(new Date(Date.now()-60000).toISOString())}&select=id&limit=1`);
  if(!recent.ok)return {ok:false,error:'INVITATION_LOOKUP_FAILED'};
  if((await recent.json()).length)return {ok:false,error:'WAIT_ONE_MINUTE_BEFORE_RESENDING'};
  // A single atomic comparison prevents two simultaneous resend requests from
  // both replacing the same link. Old copied links become invalid.
  const token=randomBytes(32).toString('base64url');
  const claimed=await adminRest(`/rest/v1/course_invitations?id=eq.${id}&token_hash=eq.${row.token_hash}&status=in.(pending,sent)&revoked_at=is.null&redeemed_at=is.null&select=id`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({token_hash:createHash('sha256').update(token).digest('hex'),status:'pending'})});
  if(!claimed.ok || !(await claimed.json()).length)return {ok:false,error:'INVITATION_CHANGED_TRY_AGAIN'};
  const event=await adminRest('/rest/v1/course_invitation_events',{method:'POST',body:JSON.stringify({invitation_id:id,event_type:'created',actor_id:session.user.id,metadata:{resend_requested:true,invited_role:row.invited_role}})});
  if(!event.ok)return {ok:false,error:'INVITATION_AUDIT_FAILED'};
  const result=await deliverStoredInvitation({id,recipientEmail:row.recipient_email,role:row.invited_role,courseTitle:getCourseBySlug(row.course_id)?.title??'Platform administration',token,expiresAt:row.expires_at,actorId:session.user.id});
  revalidatePath('/admin/invitations');return result;
}
