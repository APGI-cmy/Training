-- Additive navigation evidence. No existing completion, review, quiz or certificate
-- rows are updated, and no trigger awards completion from button interactions.
create table public.training_sequence_progress (
 user_id uuid not null references auth.users(id) on delete cascade,
 course_id text not null check(length(course_id) between 1 and 200),
 edition_key text not null check(length(edition_key) between 1 and 200),
 unit_id text not null check(length(unit_id) between 1 and 200),
 document_path text not null check(octet_length(document_path)<=1000 and document_path like '/courses/%'),
 profile text not null check(profile ~ '^[a-z0-9-]{1,60}$'),
 step_count integer not null check(step_count between 1 and 120),
 begun boolean not null default false,
 through_step integer not null default -1,
 summary_opened boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(user_id,course_id,edition_key,unit_id,document_path,profile,step_count),
 check(through_step between -1 and step_count-1),
 check(begun or (through_step=-1 and not summary_opened)),
 check(not summary_opened or through_step=step_count-1)
);
alter table public.training_sequence_progress enable row level security;
revoke all on table public.training_sequence_progress from public,anon,authenticated;
grant select,insert,update on table public.training_sequence_progress to service_role;
comment on table public.training_sequence_progress is 'Server-scoped, monotonic activity-navigation state; never a grade or qualification. Existing completions remain separate.';

create function public.training_sequence_merge(p_user uuid,p_course text,p_edition text,p_unit text,p_document text,p_profile text,p_steps integer,p_begun boolean,p_through integer,p_summary boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare before public.training_sequence_progress; saved public.training_sequence_progress;
begin
 if p_steps is null or p_steps not between 1 and 120 or p_through is null or p_through not between -1 and p_steps-1 or p_begun is null or p_summary is null or (not p_begun and (p_through<>-1 or p_summary)) or (p_summary and p_through<>p_steps-1) then raise exception 'Invalid activity sequence';end if;
 -- Serialise only this learner/activity. Retries and concurrent tabs cannot erase
 -- a later saved step or create duplicate records.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(pg_catalog.concat_ws('|',p_user,p_course,p_edition,p_unit,p_document,p_profile,p_steps),0));
 select * into before from public.training_sequence_progress where user_id=p_user and course_id=p_course and edition_key=p_edition and unit_id=p_unit and document_path=p_document and profile=p_profile and step_count=p_steps for update;
 if p_through>coalesce(before.through_step,-1)+1 then raise exception 'Complete the preceding activity step first';end if;
 insert into public.training_sequence_progress(user_id,course_id,edition_key,unit_id,document_path,profile,step_count,begun,through_step,summary_opened)
 values(p_user,p_course,p_edition,p_unit,p_document,p_profile,p_steps,p_begun,p_through,p_summary)
 on conflict(user_id,course_id,edition_key,unit_id,document_path,profile,step_count) do update set
 begun=training_sequence_progress.begun or excluded.begun,
 through_step=greatest(training_sequence_progress.through_step,excluded.through_step),
 summary_opened=training_sequence_progress.summary_opened or excluded.summary_opened,updated_at=now()
 returning * into saved;
 return jsonb_build_object('document',saved.document_path,'profile',saved.profile,'steps',saved.step_count,'begun',saved.begun,'through',saved.through_step,'summary',saved.summary_opened);
end $$;
revoke all on function public.training_sequence_merge(uuid,text,text,text,text,text,integer,boolean,integer,boolean) from public,anon,authenticated;
grant execute on function public.training_sequence_merge(uuid,text,text,text,text,text,integer,boolean,integer,boolean) to service_role;
