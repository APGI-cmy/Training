-- Maintain schedule times, recheck access before email, and bind verified inbox notices.
create or replace function public.v2_message_schedule_tick() returns integer language plpgsql security invoker set search_path='' as $$
declare s public.v2_message_schedules;recipient text;done integer=0;next_time timestamptz;
begin
 for s in select * from public.v2_message_schedules where state='active' and next_at<=now() order by next_at limit 5 for update skip locked loop
  if s.end_at is not null and s.end_at<now() then update public.v2_message_schedules set state='complete' where id=s.id;continue;end if;
  begin
   if not public.v2_message_admin(s.owner_id,s.organisation_id) then raise exception 'Administrator access has changed';end if;
   for recipient in select distinct jsonb_array_elements_text(s.recipients) loop
    if not public.v2_message_contact(s.owner_id,s.organisation_id,recipient) then raise exception 'Recipient scope changed; review recipient list';end if;
    perform public.v2_message_send(s.owner_id,gen_random_uuid(),null,s.organisation_id,s.subject,s.body,recipient,null,'schedule:'||s.id||':'||s.sent_count||':'||recipient);
   end loop;
   next_time=case s.cadence when 'daily' then s.next_at+interval '1 day' when 'weekly' then s.next_at+interval '7 days' when 'monthly' then s.next_at+interval '1 month' else s.next_at end;
   while s.cadence<>'once' and next_time<=now() loop next_time=next_time+case s.cadence when 'daily' then interval '1 day' when 'weekly' then interval '7 days' else interval '1 month' end;end loop;
   update public.v2_message_schedules set state=case when s.cadence='once' or next_time>s.end_at then 'complete' else 'active' end,next_at=next_time,sent_count=sent_count+1,last_error=null where id=s.id;done=done+1;
  exception when others then update public.v2_message_schedules set state='paused',last_error='Sending paused. Check administrator access, recipients and limits before resuming.' where id=s.id;
  end;
 end loop;return done;
end $$;
create or replace function public.v2_message_mail_claim(p_thread uuid default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 update public.v2_message_deliveries d set state='expired' from public.v2_messages m,auth.users u where m.id=d.message_id and lower(u.email)=d.email and d.state in('queued','failed','sending') and not public.v2_message_access(u.id,m.thread_id);
 -- Stop retries after 23 hours: provider idempotency retention is 24 hours.
 update public.v2_message_deliveries d set state='expired' from public.v2_messages m where m.id=d.message_id and d.state in('queued','failed','sending') and m.created_at<now()-interval '23 hours';
 with picked as(select d.message_id,d.email from public.v2_message_deliveries d join public.v2_messages m on m.id=d.message_id where (p_thread is null or m.thread_id=p_thread) and d.next_at<=now() and d.attempts<8 and (d.state in('queued','failed') or(d.state='sending' and d.lease_at<now()-interval '10 minutes')) order by d.next_at limit 40 for update of d skip locked),
 claimed as(update public.v2_message_deliveries d set state='sending',lease_at=now(),attempts=attempts+1 from picked p where d.message_id=p.message_id and d.email=p.email returning d.*)
 select coalesce(jsonb_agg(jsonb_build_object('message_id',c.message_id,'email',c.email,'subject',t.subject,'body',m.body,'thread_id',t.id,'sender_email',m.sender_email,'attachment',m.attachment_name,'organisation_id',t.organisation_id)),'[]') into result from claimed c join public.v2_messages m on m.id=c.message_id join public.v2_message_threads t on t.id=m.thread_id;return result;
end $$;

create function public.v2_message_sync_notices(p_actor uuid) returns void language sql security invoker set search_path='' as $$
 insert into public.admin_notifications(recipient_user_id,event_key,kind,message,target_path,response_type,actor_user_id,source_type,source_id)
 select p_actor,'message:'||m.id,'platform_event','New message: '||t.subject,'/messages/'||t.id,'read',m.sender_id,'message',t.id
 from public.v2_message_deliveries d join public.v2_messages m on m.id=d.message_id join public.v2_message_threads t on t.id=m.thread_id
 where d.email=public.v2_message_email(p_actor) and d.read_at is null and public.v2_message_access(p_actor,t.id)
 on conflict(recipient_user_id,event_key) do nothing;
$$;
revoke all on function public.v2_message_sync_notices(uuid) from public,anon,authenticated;
grant execute on function public.v2_message_sync_notices(uuid) to service_role;
do $$ declare definition text;begin
 select pg_get_functiondef('public.v2_sync_notification_tasks(uuid)'::regprocedure) into definition;
 if position('principal=public.v2_is_platform_principal(p_user);' in definition)=0 then raise exception 'Notification hook changed; inspect before integration';end if;
 definition=replace(definition,'principal=public.v2_is_platform_principal(p_user);','perform public.v2_message_sync_notices(p_user);principal=public.v2_is_platform_principal(p_user);');
 execute definition;
end $$;
create index v2_messages_sender_rate on public.v2_messages(sender_id,created_at desc);
create index v2_message_recipient_receipts on public.v2_message_deliveries(email,read_at);
