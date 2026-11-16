-- A local no-findings record is evaluated only against its own LU.
-- A course-wide record still requires either a whole-course clean review or
-- its own independent endorsement. No review evidence or approvals are changed.
do $migration$
declare definition text; before_call text='public.v3_clean_lu_review_ready(p_document,p_fingerprint,f->>''unit'')';
begin
 select pg_get_functiondef('public.v3_lu_review_ready(jsonb,text)'::regprocedure) into definition;
 if (length(definition)-length(replace(definition,before_call,'')))/length(before_call)<>1 then
  raise exception 'Expected exactly one finding-scope clean-review gate';
 end if;
 execute replace(definition,before_call,'public.v3_clean_lu_review_ready(p_document,p_fingerprint,f->>''unit'',coalesce(f->>''scope'',''current'')=''course'')');
end $migration$;
