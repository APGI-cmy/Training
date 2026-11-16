-- Server-only task projection. Read receipts never change the underlying workflow.
alter table public.admin_notifications add column reference_number bigint generated always as identity unique;
revoke all on sequence public.admin_notifications_reference_number_seq from public,anon,authenticated;
grant usage,select on sequence public.admin_notifications_reference_number_seq to service_role;

create function public.v3_notification_pending(n public.admin_notifications) returns boolean
language sql stable security invoker set search_path='' as $$
 select case when n.source_type='review' and n.context ? 'review_task'
 then coalesce((n.context->>'task_pending')::boolean,false)
 else public.v2_notification_pending(n) end;
$$;

create function public.v3_notification_payload(n public.admin_notifications) returns jsonb
language sql stable security invoker set search_path='' as $$
 select (to_jsonb(n)-'recipient_user_id'-'learner_user_id') || jsonb_build_object('pending',public.v3_notification_pending(n),'event',(
  select jsonb_build_object('action',h.action,'actor',h.snapshot#>>'{events,-1,actor}',
   'detail',h.snapshot#>>'{events,-1,detail}','version',h.snapshot#>>'{workflow,commercials,-1,id}',
   'task_decision',case when h.action='task_decision' then h.snapshot#>'{taskDecisions,-1}' end,
   'proposal',case when h.action='commercial_proposal' then h.snapshot#>'{commercialFeedback,-1}' end,
   'report_id',case when h.action='report' then h.snapshot#>>'{reports,-1,id}' end,
   'event_index',jsonb_array_length(coalesce(h.snapshot->'events','[]'))-1,
   'finding_id',case when h.action in ('finding','reply','fixed','close') then (
    select f->>'id' from jsonb_array_elements(coalesce(h.snapshot->'findings','[]')) f
    where not exists(select 1 from public.course_review_history previous,
     lateral jsonb_array_elements(coalesce(previous.snapshot->'findings','[]')) old_f
     where previous.round_id=h.round_id and previous.revision=h.revision-1 and old_f=f) limit 1) end)
  from public.course_review_history h where h.round_id=n.source_id and n.event_key='course-review:'||h.round_id||':'||h.revision limit 1));
$$;

create function public.v3_notification_inbox(p_user uuid,p_tasks jsonb default '[]',p_revisions jsonb default '[]',p_filter text default 'all',p_offset integer default 0,p_summary boolean default false) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare task jsonb;revision jsonb;result jsonb;receipt_rows jsonb;mailbox text;
begin
 if p_filter not in ('all','unread','response') or p_offset<0 or p_offset>10000 or jsonb_typeof(p_tasks)<>'array' or jsonb_array_length(p_tasks)>1000 then raise exception 'Invalid inbox request';end if;
 select lower(email) into mailbox from auth.users where id=p_user and email_confirmed_at is not null;
 if mailbox is null then raise exception 'Verified account required';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,4103));
 -- The server derived these tasks from the verified account and actual review data.
 -- Reject a projection if a reviewer changed the source in the meantime.
 for revision in select value from jsonb_array_elements(p_revisions) loop
  if not exists(select 1 from public.course_review_rounds r where r.id=(revision->>'id')::uuid and r.revision=(revision->>'revision')::integer
   and (public.v2_is_platform_principal(p_user) or r.document->'participants' @> jsonb_build_array(jsonb_build_object('email',mailbox))))
  then raise exception 'Review changed; refresh notifications';end if;
 end loop;
 perform public.v2_sync_notification_tasks(p_user);
 -- Retain earlier general reminders as readable history, rather than a second action.
 update public.admin_notifications set response_type='read',context=context||'{"legacy_review_reminder":true}'
 where recipient_user_id=p_user and source_type='review' and response_type='action' and not(context ? 'review_task');
 update public.admin_notifications n set context=n.context||jsonb_build_object('task_pending',false,'resolved_at',coalesce(n.context->>'resolved_at',now()::text))
 where recipient_user_id=p_user and source_type='review' and context ? 'review_task' and coalesce((context->>'task_pending')::boolean,false)
 and not exists(select 1 from jsonb_array_elements(p_tasks) t where t->>'key'=n.event_key);
 for task in select value from jsonb_array_elements(p_tasks) loop
  if not exists(select 1 from public.course_review_rounds r where r.id=(task->>'roundId')::uuid and r.status='open'
   and r.revision=(task->>'revision')::integer and (public.v2_is_platform_principal(p_user) or r.document->'participants' @> jsonb_build_array(jsonb_build_object('email',mailbox))))
  then raise exception 'Review task unavailable';end if;
  if not ((task->>'path')='/course-reviews/'||(task->>'roundId') or (task->>'path')='/course-reviews/'||(task->>'roundId')||'/commercials')
   or (task->>'anchor')!~'^[a-z0-9_-]+$' or (task->>'key') not like 'review-action:%' then raise exception 'Invalid review destination';end if;
  insert into public.admin_notifications(recipient_user_id,event_key,kind,message,target_path,response_type,source_type,source_id,context)
  values(p_user,task->>'key','platform_event',task->>'title',(task->>'path')||'#'||(task->>'anchor'),'action','review',(task->>'roundId')::uuid,
   jsonb_build_object('review_task',task->>'key','task_pending',true,'requirement',task->>'requirement','version',task->>'version'))
  on conflict(recipient_user_id,event_key) do update set message=excluded.message,target_path=excluded.target_path,
   context=(admin_notifications.context-'resolved_at')||excluded.context;
 end loop;
 with notices as materialized(select n.*,public.v3_notification_pending(n) pending from public.admin_notifications n where recipient_user_id=p_user),
 selected as(select * from notices where p_filter='all' or p_filter='unread' and read_at is null or p_filter='response' and pending)
 select jsonb_build_object('unread',(select count(*) from notices where read_at is null),'responses',(select count(*) from notices where pending),
 'attention',(select count(*) from notices where read_at is null or pending),'total',(select count(*) from selected),
 'items',case when p_summary then '[]'::jsonb else coalesce((select jsonb_agg(public.v3_notification_payload(n) order by n.created_at desc,n.id desc) from
 (select id from selected order by created_at desc,id desc limit 50 offset p_offset) page join public.admin_notifications n on n.id=page.id),'[]'::jsonb) end) into result;
 if not p_summary then
  select coalesce(jsonb_agg(public.v3_notification_payload(n)||jsonb_build_object('recipient_email',u.email) order by n.created_at desc,n.id desc),'[]'::jsonb) into receipt_rows
  from(select id from public.admin_notifications where actor_user_id=p_user and recipient_user_id<>p_user order by created_at desc,id desc limit 50) page
  join public.admin_notifications n on n.id=page.id join auth.users u on u.id=n.recipient_user_id;
  result=result||jsonb_build_object('receipts',receipt_rows);
 end if;
 return result;
end $$;

revoke all on function public.v3_notification_pending(public.admin_notifications),public.v3_notification_payload(public.admin_notifications),public.v3_notification_inbox(uuid,jsonb,jsonb,text,integer,boolean) from public,anon,authenticated;
grant execute on function public.v3_notification_pending(public.admin_notifications),public.v3_notification_payload(public.admin_notifications),public.v3_notification_inbox(uuid,jsonb,jsonb,text,integer,boolean) to service_role;

create function public.v3_notification_one(p_user uuid,p_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select public.v3_notification_payload(n) from public.admin_notifications n where n.id=p_id and n.recipient_user_id=p_user;
$$;
create function public.v3_notification_targets(p_user uuid,p_path text,p_selected uuid default null) returns jsonb
language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(public.v3_notification_payload(n) order by n.created_at desc,n.id desc),'[]'::jsonb)
 from (select * from public.admin_notifications x where x.recipient_user_id=p_user
 and (x.id=p_selected or (public.v3_notification_pending(x) or x.read_at is null)
 and (split_part(x.target_path,'#',1)=p_path or x.source_type='review' and split_part(p_path,'/',3)=x.source_id::text))
 order by (x.id=p_selected) desc,x.created_at desc,x.id desc limit 200) n;
$$;
revoke all on function public.v3_notification_one(uuid,uuid),public.v3_notification_targets(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.v3_notification_one(uuid,uuid),public.v3_notification_targets(uuid,text,uuid) to service_role;
