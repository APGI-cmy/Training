create function public.v2_preserve_enrolment_company() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if old.status='enrolled' and old.organisation_id is not null and new.organisation_id is distinct from old.organisation_id then raise exception 'ENROLMENT_COMPANY_TRANSFER_REQUIRES_REVIEW'; end if;
 return new;
end $$;
create trigger preserve_enrolment_company before update on public.course_enrolments for each row execute function public.v2_preserve_enrolment_company();
