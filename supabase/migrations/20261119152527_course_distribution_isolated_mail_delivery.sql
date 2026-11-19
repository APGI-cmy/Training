create function public.v6_claim_distribution_mail() returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 update public.v5_notification_mail q set state='superseded' from public.admin_notifications n
 where q.notification_id=n.id and n.event_key like 'distribution-message:%'
 and q.state in('pending','failed','sending')
 and (q.revision<>n.mail_revision or n.context->>'task_pending'='false' or public.v5_notification_retired(n));
 update public.v5_notification_mail q set state='reconcile',last_error='Check provider acceptance before retrying.'
 from public.admin_notifications n where q.notification_id=n.id and n.event_key like 'distribution-message:%'
 and q.state in('failed','sending') and q.first_attempt_at<now()-interval '23 hours';
 with chosen as (
  select q.id from public.v5_notification_mail q join public.admin_notifications n on n.id=q.notification_id
  join auth.users u on u.id=n.recipient_user_id and u.email_confirmed_at is not null
  where n.event_key like 'distribution-message:%' and q.next_at<=now()
  and (q.state in('pending','failed') or q.state='sending' and q.claimed_at<now()-interval '5 minutes')
  order by q.next_at,q.id limit 8 for update of q skip locked
 ), claimed as (
  update public.v5_notification_mail q set state='sending',claim_token=gen_random_uuid(),claimed_at=now(),first_attempt_at=coalesce(q.first_attempt_at,now())
  from chosen c where c.id=q.id returning q.*
 ) select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'claimToken',q.claim_token,'notificationId',n.id,'revision',q.revision,
 'email',lower(u.email),'message',n.message,'requirement',n.context->>'requirement','path',n.target_path,
 'action',n.response_type='action' and public.v3_notification_pending(n),'sender',a.email,'sourceId',n.source_id)), '[]'::jsonb)
 into result from claimed q join public.admin_notifications n on n.id=q.notification_id
 join auth.users u on u.id=n.recipient_user_id left join auth.users a on a.id=n.actor_user_id;
 return result;
end $$;
revoke all on function public.v6_claim_distribution_mail() from public,anon,authenticated;
grant execute on function public.v6_claim_distribution_mail() to service_role;
