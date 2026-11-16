-- New and materially changed personal notifications only. No historical backfill.
alter table public.admin_notifications add column mail_revision bigint not null default 0;
create table public.v5_notification_mail (
 id uuid primary key default gen_random_uuid(),
 notification_id uuid not null references public.admin_notifications(id) on delete cascade,
 revision bigint not null,
 state text not null default 'pending' check(state in('pending','sending','accepted','failed','superseded','reconcile')),
 created_at timestamptz not null default now(), next_at timestamptz not null default now()+interval '1 minute',
 first_attempt_at timestamptz, claimed_at timestamptz, claim_token uuid,
 provider_id text, last_error text,
 unique(notification_id,revision)
);
create index v5_notification_mail_due on public.v5_notification_mail(next_at) where state in('pending','failed','sending');
alter table public.v5_notification_mail enable row level security;
create policy service_only on public.v5_notification_mail to service_role using(true) with check(true);
revoke all on public.v5_notification_mail from public,anon,authenticated;
grant select,insert,update,delete on public.v5_notification_mail to service_role;

create function public.v5_notification_semantics(n public.admin_notifications) returns jsonb
language sql immutable set search_path='' as $$
 select jsonb_build_array(n.recipient_user_id,n.message,n.target_path,n.response_type,n.actor_user_id,
 n.context->'requirement',n.context->'task_pending',n.context->'version',n.context->'reminder_for');
$$;
-- AFTER trigger sees the inserted row for the FK; revision uses a separate BEFORE trigger.
create function public.v5_notification_revision() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then new.mail_revision=1;
 elsif public.v5_notification_semantics(new) is distinct from public.v5_notification_semantics(old) then new.mail_revision=old.mail_revision+1;
 else new.mail_revision=old.mail_revision;end if;
 return new;
end $$;
create function public.v5_queue_notification_mail() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and new.mail_revision=old.mail_revision then return new;end if;
 update public.v5_notification_mail set state='superseded' where notification_id=new.id and state in('pending','failed');
 if new.context ? 'review_task' and new.context->>'task_pending'='false' then return new;end if;
 insert into public.v5_notification_mail(notification_id,revision) values(new.id,new.mail_revision) on conflict do nothing;
 return new;
end $$;
create trigger v5_notification_revision before insert or update on public.admin_notifications for each row execute function public.v5_notification_revision();
create trigger v5_notification_mail after insert or update on public.admin_notifications for each row execute function public.v5_queue_notification_mail();

create function public.v5_claim_notification_mail() returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 update public.v5_notification_mail q set state='superseded' from public.admin_notifications n
 where q.notification_id=n.id and q.state in('pending','failed','sending') and (q.revision<>n.mail_revision or n.context->>'task_pending'='false');
 -- Provider idempotency has a finite retention window. Ambiguous deliveries older than 23h require reconciliation, never blind resending.
 update public.v5_notification_mail set state='reconcile',last_error='Check provider acceptance before retrying.'
 where state in('failed','sending') and first_attempt_at<now()-interval '23 hours';
 with chosen as (
  select q.id from public.v5_notification_mail q join public.admin_notifications n on n.id=q.notification_id
  join auth.users u on u.id=n.recipient_user_id and u.email_confirmed_at is not null
  where q.next_at<=now() and (q.state in('pending','failed') or q.state='sending' and q.claimed_at<now()-interval '5 minutes')
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
create function public.v5_finish_notification_mail(p_id uuid,p_claim uuid,p_provider text,p_error text) returns void
language sql security invoker set search_path='' as $$
 update public.v5_notification_mail set state=case when p_provider is not null then 'accepted' else 'failed' end,
 provider_id=p_provider,last_error=p_error,next_at=now()+interval '15 minutes'
 where id=p_id and claim_token=p_claim and state='sending';
$$;
revoke all on function public.v5_notification_semantics(public.admin_notifications),public.v5_notification_revision(),public.v5_queue_notification_mail(),public.v5_claim_notification_mail(),public.v5_finish_notification_mail(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.v5_notification_semantics(public.admin_notifications),public.v5_notification_revision(),public.v5_queue_notification_mail(),public.v5_claim_notification_mail(),public.v5_finish_notification_mail(uuid,uuid,text,text) to service_role;
