-- Require the correctly scoped ledger even when a pre-existing row was already completed.
create or replace function tiger_progress_private.guard_completion() returns trigger language plpgsql security definer set search_path='' as $$
declare completed boolean; edition text;
begin
 if new.course_id<>'tiger-kidnapping-telecommunications' and not exists(select from public.course_editions d where d.runtime_course_id=new.course_id and d.course_id='tiger-kidnapping-telecommunications') then return new;end if;
 if tg_table_name='scorm_attempts' then
   completed=new.completion_status='completed' and new.success_status='passed';
 else
   completed=new.status='completed';
 end if;
 if not completed then return new;end if;
 select coalesce(e.edition_id::text,'legacy') into edition from public.course_enrolments e where e.user_id=new.user_id and e.course_id=new.course_id;
 if not exists(select from public.tiger_unit_progress p where p.user_id=new.user_id and p.course_id=new.course_id and p.unit_id=new.unit_id and p.edition_key=coalesce(edition,'legacy') and p.policy_version='tiger-progression-1-2ee5c4d56ef89282' and p.qualified_at is not null) then raise exception 'Tiger viewing, summaries and quiz requirements are incomplete' using errcode='42501';end if;
 return new;
end;$$;
