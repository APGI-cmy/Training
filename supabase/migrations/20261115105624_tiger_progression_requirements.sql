-- Additive Tiger rollout. Existing review, enrolment, SCORM and result rows are never rewritten.
create table public.tiger_unit_progress (
  user_id uuid not null references auth.users(id),
  course_id text not null,
  unit_id text not null,
  edition_key text not null,
  policy_version text not null,
  video_ranges jsonb not null default '[]'::jsonb,
  summaries text[] not null default '{}',
  quiz_passed boolean not null default false,
  qualified_at timestamptz,
  legacy_credit boolean not null default false,
  heartbeat_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  primary key(user_id,course_id,unit_id,edition_key,policy_version),
  check (jsonb_typeof(video_ranges)='array' and jsonb_array_length(video_ranges)<=512)
);
alter table public.tiger_unit_progress enable row level security;
revoke all on public.tiger_unit_progress from public,anon,authenticated;
grant select on public.tiger_unit_progress to authenticated;
grant select,insert,update on public.tiger_unit_progress to service_role;
create policy tiger_progress_read_own on public.tiger_unit_progress for select to authenticated using ((select auth.uid())=user_id);

-- Preserve genuine historical passes as explicit historical credit, not invented viewing evidence.
insert into public.tiger_unit_progress(user_id,course_id,unit_id,edition_key,policy_version,quiz_passed,qualified_at,legacy_credit)
select s.user_id,s.course_id,s.unit_id,coalesce(e.edition_id::text,'legacy'),'tiger-progression-1-2ee5c4d56ef89282',true,coalesce(s.passed_at,s.completed_at,s.updated_at),true
from public.scorm_attempts s left join public.course_enrolments e on e.user_id=s.user_id and e.course_id=s.course_id
where (s.course_id='tiger-kidnapping-telecommunications' or exists(select from public.course_editions d where d.runtime_course_id=s.course_id and d.course_id='tiger-kidnapping-telecommunications')) and s.completion_status='completed' and s.success_status='passed'
on conflict do nothing;

create function public.tiger_merge_progress(p_user uuid,p_course text,p_unit text,p_edition text,p_version text,p_duration numeric,p_ranges jsonb,p_summary text,p_passed boolean,p_activity_keys text[])
returns public.tiger_unit_progress language plpgsql security invoker set search_path='' as $$
declare saved public.tiger_unit_progress; merged jsonb; prior_seconds numeric; next_seconds numeric; allowed_seconds numeric; summary_list text[]; qualifies boolean;
begin
  if p_duration<=0 or p_duration>7200 or p_duration is null or p_version<>'tiger-progression-1-2ee5c4d56ef89282' or jsonb_typeof(p_ranges)<>'array' or jsonb_array_length(p_ranges)>512 then raise exception 'Invalid viewing evidence';end if;
  if exists(select from jsonb_array_elements(p_ranges) a where jsonb_typeof(a)<>'array' or jsonb_array_length(a)<>2 or jsonb_typeof(a->0)<>'number' or jsonb_typeof(a->1)<>'number' or (a->>0)::numeric<0 or (a->>1)::numeric<=(a->>0)::numeric or (a->>1)::numeric>p_duration+0.25) then raise exception 'Invalid viewing evidence';end if;
  insert into public.tiger_unit_progress(user_id,course_id,unit_id,edition_key,policy_version) values(p_user,p_course,p_unit,p_edition,p_version) on conflict do nothing;
  select * into strict saved from public.tiger_unit_progress where user_id=p_user and course_id=p_course and unit_id=p_unit and edition_key=p_edition and policy_version=p_version for update;
  select coalesce(sum((r->>1)::numeric-(r->>0)::numeric),0) into prior_seconds from jsonb_array_elements(saved.video_ranges) r;
  with spans as (select (r->>0)::numeric a,least((r->>1)::numeric,p_duration) b from jsonb_array_elements(saved.video_ranges||p_ranges) r),
  ordered as (select *,max(b) over(order by a,b rows between unbounded preceding and 1 preceding) prev from spans),
  grouped as (select *,sum(case when prev is null or a>prev then 1 else 0 end) over(order by a,b) grp from ordered),
  united as (select min(a) a,max(b) b from grouped group by grp)
  select coalesce(jsonb_agg(jsonb_build_array(a,b) order by a),'[]'::jsonb),coalesce(sum(b-a),0) into merged,next_seconds from united;
  allowed_seconds=least(30,greatest(0,extract(epoch from clock_timestamp()-saved.heartbeat_at))*4+1.5);
  if next_seconds-prior_seconds>allowed_seconds then raise exception 'Viewing evidence exceeds elapsed session time';end if;
  summary_list=saved.summaries;
  if p_summary is not null then
    if not(p_summary=any(p_activity_keys)) or next_seconds/p_duration<0.8 then raise exception 'Activity prerequisites are incomplete';end if;
    select array_agg(distinct a order by a) into summary_list from unnest(saved.summaries||array[p_summary]) a;
  end if;
  qualifies=next_seconds/p_duration>=0.8 and p_activity_keys<@summary_list;
  update public.tiger_unit_progress set video_ranges=merged,summaries=summary_list,
    quiz_passed=saved.quiz_passed or (p_passed and qualifies),
    qualified_at=case when qualifies and (saved.quiz_passed or p_passed) then coalesce(saved.qualified_at,clock_timestamp()) else saved.qualified_at end,
    heartbeat_at=case when next_seconds>prior_seconds then clock_timestamp() else saved.heartbeat_at end,updated_at=clock_timestamp()
  where user_id=p_user and course_id=p_course and unit_id=p_unit and edition_key=p_edition and policy_version=p_version returning * into saved;
  return saved;
end;$$;
revoke all on function public.tiger_merge_progress(uuid,text,text,text,text,numeric,jsonb,text,boolean,text[]) from public,anon,authenticated;
grant execute on function public.tiger_merge_progress(uuid,text,text,text,text,numeric,jsonb,text,boolean,text[]) to service_role;

create schema if not exists tiger_progress_private;
revoke all on schema tiger_progress_private from public,anon,authenticated;
create table public.tiger_scorm_history (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id),
 course_id text not null,
 unit_id text not null,
 attempt jsonb not null,
 preserved_at timestamptz not null default clock_timestamp()
);
alter table public.tiger_scorm_history enable row level security;
revoke all on public.tiger_scorm_history from public,anon,authenticated;
grant select on public.tiger_scorm_history to authenticated,service_role;
create policy tiger_history_read_own on public.tiger_scorm_history for select to authenticated using ((select auth.uid())=user_id);
create function tiger_progress_private.preserve_attempt() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (old.course_id='tiger-kidnapping-telecommunications' or exists(select from public.course_editions d where d.runtime_course_id=old.course_id and d.course_id='tiger-kidnapping-telecommunications')) and (to_jsonb(old)-'updated_at'-'last_launched_at') is distinct from (to_jsonb(new)-'updated_at'-'last_launched_at') then
  insert into public.tiger_scorm_history(user_id,course_id,unit_id,attempt) values(old.user_id,old.course_id,old.unit_id,to_jsonb(old));
 end if;
 return new;
end;$$;
revoke all on function tiger_progress_private.preserve_attempt() from public,anon,authenticated;
create trigger tiger_scorm_archive before update on public.scorm_attempts for each row execute function tiger_progress_private.preserve_attempt();
create function tiger_progress_private.guard_completion() returns trigger language plpgsql security definer set search_path='' as $$
declare completed boolean; was_completed boolean; edition text;
begin
 if new.course_id<>'tiger-kidnapping-telecommunications' and not exists(select from public.course_editions d where d.runtime_course_id=new.course_id and d.course_id='tiger-kidnapping-telecommunications') then return new;end if;
 if tg_table_name='scorm_attempts' then
   completed=new.completion_status='completed' and new.success_status='passed';
   if tg_op='UPDATE' then was_completed=old.completion_status='completed' and old.success_status='passed';end if;
 else
   completed=new.status='completed';if tg_op='UPDATE' then was_completed=old.status='completed';end if;
 end if;
 if not completed or coalesce(was_completed,false) then return new;end if;
 select coalesce(e.edition_id::text,'legacy') into edition from public.course_enrolments e where e.user_id=new.user_id and e.course_id=new.course_id;
 if not exists(select from public.tiger_unit_progress p where p.user_id=new.user_id and p.course_id=new.course_id and p.unit_id=new.unit_id and p.edition_key=coalesce(edition,'legacy') and p.policy_version='tiger-progression-1-2ee5c4d56ef89282' and p.qualified_at is not null) then raise exception 'Tiger viewing, summaries and quiz requirements are incomplete' using errcode='42501';end if;
 return new;
end;$$;
revoke all on function tiger_progress_private.guard_completion() from public,anon,authenticated;
create trigger tiger_scorm_completion_guard before insert or update on public.scorm_attempts for each row execute function tiger_progress_private.guard_completion();
create trigger tiger_unit_completion_guard before insert or update on public.learner_progress for each row execute function tiger_progress_private.guard_completion();

create function public.tiger_unit_asset_allowed(p_course text,p_unit integer) returns boolean language sql stable security invoker set search_path='' as $$
 select (p_course='tiger-kidnapping-telecommunications' or exists(select from public.course_editions d where d.runtime_course_id=p_course and d.course_id='tiger-kidnapping-telecommunications')) and p_unit between 1 and 8 and not exists(
   select from generate_series(1,p_unit-1) previous_unit where not exists(
     select from public.tiger_unit_progress p where p.user_id=(select auth.uid()) and p.course_id=p_course and p.unit_id='tiger-telecom-lu-'||previous_unit and p.policy_version='tiger-progression-1-2ee5c4d56ef89282' and p.qualified_at is not null and p.edition_key=coalesce((select e.edition_id::text from public.course_enrolments e where e.user_id=(select auth.uid()) and e.course_id=p_course),'legacy')
   )
 );
$$;
revoke all on function public.tiger_unit_asset_allowed(text,integer) from public,anon;
grant execute on function public.tiger_unit_asset_allowed(text,integer) to authenticated,service_role;
