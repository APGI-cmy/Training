-- Personal inboxes and sender-owned receipts; no review data is reset.
alter table public.admin_notifications add column reminder_count integer not null default 0,
 add column last_reminded_at timestamptz;

create function public.v4_review_message_recipients(p_actor uuid,p_round uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare r public.course_review_rounds; mailbox text;
begin
 select lower(email) into mailbox from auth.users where id=p_actor and email_confirmed_at is not null;
 select * into r from public.course_review_rounds where id=p_round;
 if mailbox is null or r.id is null or not(public.v2_is_platform_principal(p_actor) or exists(select 1 from jsonb_array_elements(r.document->'participants') p where p->>'email'=mailbox and p->>'state'<>'declined')) then raise exception 'Review unavailable';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'email',lower(u.email),'principal',public.v2_is_platform_principal(u.id)))
 from auth.users u where u.email_confirmed_at is not null and exists(select 1 from jsonb_array_elements(r.document->'participants') p where p->>'email'=lower(u.email) and p->>'state'<>'declined' and (p->>'userId' is null or p->>'userId'=u.id::text))),'[]'::jsonb);
end $$;

create function public.v4_sync_review_messages(p_actor uuid,p_round uuid,p_revision integer,p_tasks jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare recipients jsonb; t jsonb;r public.course_review_rounds;sender uuid;
begin
 recipients=public.v4_review_message_recipients(p_actor,p_round);
 select * into r from public.course_review_rounds where id=p_round for update;
 if r.revision<>p_revision or r.status<>'open' then raise exception 'Review changed; refresh messages';end if;
 if jsonb_typeof(p_tasks)<>'array' or jsonb_array_length(p_tasks)>20000 then raise exception 'Invalid review messages';end if;
 update public.admin_notifications n set context=n.context||jsonb_build_object('task_pending',false,'resolved_at',coalesce(n.context->>'resolved_at',now()::text))
 where n.source_id=p_round and n.source_type='review' and n.context ? 'review_task' and coalesce((n.context->>'task_pending')::boolean,false)
 and exists(select 1 from jsonb_array_elements(recipients) p where p->>'id'=n.recipient_user_id::text)
 and not exists(select 1 from jsonb_array_elements(p_tasks) x where x->>'recipientUserId'=n.recipient_user_id::text and x->>'key'=n.event_key);
 for t in select value from jsonb_array_elements(p_tasks) loop
  if not exists(select 1 from jsonb_array_elements(recipients) p where p->>'id'=t->>'recipientUserId') or t->>'roundId'<>p_round::text or (t->>'revision')::integer<>p_revision
   or t->>'key' not like 'review-action:'||p_round||':%' or (t->>'anchor')!~'^[a-z0-9_-]+$'
   or t->>'path' not in('/course-reviews/'||p_round,'/course-reviews/'||p_round||'/commercials') then raise exception 'Invalid message destination';end if;
  sender=nullif(t->>'actorUserId','')::uuid;
  if sender is not null and not(sender::text=r.document->>'requesterId' or exists(select 1 from jsonb_array_elements(recipients) p where p->>'id'=sender::text)) then raise exception 'Invalid message sender';end if;
  insert into public.admin_notifications(recipient_user_id,event_key,kind,message,target_path,response_type,actor_user_id,source_type,source_id,context)
  values((t->>'recipientUserId')::uuid,t->>'key','platform_event',t->>'title',(t->>'path')||'#'||(t->>'anchor'),'action',sender,'review',p_round,
   jsonb_build_object('review_task',t->>'key','task_pending',true,'requirement',t->>'requirement','version',t->>'version','unit',t->>'unit'))
  on conflict(recipient_user_id,event_key) do update set message=excluded.message,target_path=excluded.target_path,actor_user_id=excluded.actor_user_id,
   context=(admin_notifications.context-'resolved_at')||excluded.context;
 end loop;
end $$;

create function public.v4_notification_message(n public.admin_notifications) returns jsonb
language sql stable security invoker set search_path='' as $$
 with payload as (select public.v3_notification_payload(n) p), location as (
 select coalesce(n.context->>'unit',(select case when f->>'scope'='course' then '*' else f->>'unit' end
 from public.course_review_rounds r,jsonb_array_elements(r.document->'findings') f,payload
 where r.id=n.source_id and (f->>'id'=payload.p#>>'{event,finding_id}' or n.target_path like '%#finding-'||(f->>'id')) limit 1)) unit)
 select payload.p||jsonb_build_object('recipient_email',(select lower(email) from auth.users where id=n.recipient_user_id),
 'sender_email',(select lower(email) from auth.users where id=n.actor_user_id),'unit_slug',location.unit,
 'reminder_count',n.reminder_count,'last_reminded_at',n.last_reminded_at,
 'can_remind',n.source_type='review' and n.actor_user_id is not null and n.actor_user_id<>n.recipient_user_id and n.read_at is null
   and coalesce(n.last_reminded_at,n.created_at)<=now()-interval '24 hours'
   and not(n.context ? 'reminder_for') and (n.response_type<>'action' or public.v3_notification_pending(n))
   and exists(select 1 from public.course_review_rounds r where r.id=n.source_id and r.status='open' and (r.document->>'cutoff')::timestamptz>now())) from payload,location;
$$;

create function public.v4_sent_notifications(p_actor uuid,p_round uuid default null,p_unit text default null,p_offset integer default 0) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if not exists(select 1 from auth.users where id=p_actor and email_confirmed_at is not null) or p_offset<0 or p_offset>10000 then raise exception 'Verified account required';end if;
 if p_round is not null then perform public.v4_review_message_recipients(p_actor,p_round);end if;
 with messages as materialized(select public.v4_notification_message(n) item,n.created_at,n.id from public.admin_notifications n
 where n.actor_user_id=p_actor and n.recipient_user_id<>p_actor and not(n.context ? 'reminder_for') and (p_round is null or n.source_id=p_round)),
 scoped as(select * from messages where p_unit is null or item->>'unit_slug' in(p_unit,'*'))
 select jsonb_build_object('total',(select count(*) from scoped),'items',coalesce((select jsonb_agg(page.item order by page.created_at desc,page.id desc) from(select * from scoped order by created_at desc,id desc limit 50 offset p_offset) page),'[]'::jsonb)) into result;
 return result;
end $$;

create function public.v4_remind_notification(p_actor uuid,p_id uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare n public.admin_notifications; child uuid; item jsonb;
begin
 select * into n from public.admin_notifications where id=p_id and actor_user_id=p_actor and recipient_user_id<>p_actor for update;
 if not found or not exists(select 1 from auth.users where id=p_actor and email_confirmed_at is not null) then raise exception 'Message unavailable';end if;
 item=public.v4_notification_message(n);
 if not coalesce((item->>'can_remind')::boolean,false) then raise exception 'Reminders are available only for unread, outstanding messages after 24 hours, and once per 24 hours thereafter';end if;
 perform public.v4_review_message_recipients(p_actor,n.source_id);
 update public.admin_notifications set reminder_count=reminder_count+1,last_reminded_at=now() where id=n.id;
 insert into public.admin_notifications(recipient_user_id,event_key,kind,message,target_path,response_type,actor_user_id,source_type,source_id,context)
 values(n.recipient_user_id,'message-reminder:'||n.id||':'||(n.reminder_count+1),'platform_event','Reminder: '||n.message,n.target_path,'read',p_actor,n.source_type,n.source_id,
 jsonb_build_object('reminder_for',n.id,'requirement',n.context->>'requirement','unit',item->>'unit_slug')) returning id into child;
 return child;
end $$;

create function public.v4_reminder_read_receipt() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.read_at is not null and old.read_at is null and new.context ? 'reminder_for' then
  update public.admin_notifications set read_at=coalesce(read_at,new.read_at) where id=(new.context->>'reminder_for')::uuid and recipient_user_id=new.recipient_user_id;
 end if;return new;
end $$;
create trigger v4_reminder_read after update of read_at on public.admin_notifications for each row execute function public.v4_reminder_read_receipt();

-- Keep recipient-side refreshes consistent with proactive sender projections.
do $patch$
declare definition text;
begin
 select pg_get_functiondef('public.v3_notification_inbox(uuid,jsonb,jsonb,text,integer,boolean)'::regprocedure) into definition;
 definition=replace(definition,'response_type,source_type,source_id,context)','response_type,actor_user_id,source_type,source_id,context)');
 definition=replace(definition,'''action'',''review'',','''action'',nullif(task->>''actorUserId'','''')::uuid,''review'',');
 definition=replace(definition,'''version'',task->>''version''))','''version'',task->>''version'',''unit'',task->>''unit''))');
 definition=replace(definition,'target_path=excluded.target_path,','target_path=excluded.target_path,actor_user_id=excluded.actor_user_id,');
 execute definition;
end $patch$;

-- Explicit reopen markers fail closed in the database publication gate too.
do $gate$
declare definition text;
begin
 select pg_get_functiondef('public.v3_lu_review_ready(jsonb,text)'::regprocedure) into definition;
 definition=replace(definition,'if response#>>''{decision,decision}''=''reopen'' then return false;end if;','if response#>>''{decision,decision}''=''reopen'' or response ? ''endorsementReopen'' then return false;end if;');
 definition=replace(definition,'if f->>''outcome''=''satisfied'' then','if f#>>''{declarationReopen,findingAt}''=f->>''at'' and f#>>''{declarationReopen,fingerprint}''=p_fingerprint then return false;end if;'||chr(10)||'if f->>''outcome''=''satisfied'' then');
 execute definition;
end $gate$;

revoke all on function public.v4_review_message_recipients(uuid,uuid),public.v4_sync_review_messages(uuid,uuid,integer,jsonb),public.v4_notification_message(public.admin_notifications),public.v4_sent_notifications(uuid,uuid,text,integer),public.v4_remind_notification(uuid,uuid),public.v4_reminder_read_receipt() from public,anon,authenticated;
grant execute on function public.v4_review_message_recipients(uuid,uuid),public.v4_sync_review_messages(uuid,uuid,integer,jsonb),public.v4_notification_message(public.admin_notifications),public.v4_sent_notifications(uuid,uuid,text,integer),public.v4_remind_notification(uuid,uuid),public.v4_reminder_read_receipt() to service_role;
