do $$ declare constraint_name text;begin
 select conname into constraint_name from pg_constraint where conrelid='public.admin_notifications'::regclass and contype='c' and pg_get_constraintdef(oid) like '%kind%';
 if constraint_name is not null then execute format('alter table public.admin_notifications drop constraint %I',constraint_name);end if;
end $$;
alter table public.admin_notifications add constraint admin_notifications_kind_check check(kind in ('learner_enrolled','admin_joined','certificate_issued','course_review_event'));
create function public.v2_review_principal_notice() returns trigger language plpgsql security invoker set search_path='' as $$
declare course text;detail text;
begin
 if new.action not in ('terms','decline','report','endorse') then return new;end if;
 select course_id into course from public.course_review_rounds where id=new.round_id;
 detail=case when new.action='terms' then 'Company terms '||coalesce(new.snapshot#>>'{terms,decision}','updated')||': '||coalesce(new.snapshot#>>'{terms,reason}','') else 'Course review update: '||new.action end;
 insert into public.admin_notifications(recipient_user_id,event_key,kind,course_id,message)
 select user_id,'course-review:'||new.round_id||':'||new.revision,'course_review_event',course,detail||' — Review workspace /course-reviews/'||new.round_id
 from public.platform_principals where user_id is not null on conflict(recipient_user_id,event_key) do nothing;
 return new;
end $$;
revoke all on function public.v2_review_principal_notice() from public,anon,authenticated;
create trigger course_review_principal_notice after insert on public.course_review_history for each row execute function public.v2_review_principal_notice();
create or replace function public.v2_claim_review_mail() returns setof public.course_review_mail
language plpgsql security invoker set search_path='' as $$
begin
 update public.course_review_mail set state='attention',last_error='Delivery needs operator review; retry window or attempt limit reached'
 where (state in ('sending','failed') and first_attempt_at < now()-interval '23 hours') or (state='failed' and attempts>=5);
 return query update public.course_review_mail set state='sending',locked_at=now(),first_attempt_at=coalesce(first_attempt_at,now()),attempts=attempts+1
 where id in(select id from public.course_review_mail where state in ('pending','failed') or (state='sending' and locked_at<now()-interval '10 minutes') order by created_at for update skip locked limit 10) returning *;
end $$;
revoke all on function public.v2_claim_review_mail() from public,anon,authenticated;
grant execute on function public.v2_claim_review_mail() to service_role;
