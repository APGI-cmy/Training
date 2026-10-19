-- V2 only: content corrections may continue while commercials are prepared.
-- A reviewer may invalidate final clearance, never create or change a commercial approval.
create or replace function public.v2_commit_course_review(p_id uuid,p_revision integer,p_document jsonb,p_actor uuid,p_action text,p_mail jsonb default '[]'::jsonb)
returns integer language plpgsql security invoker set search_path='' as $function$
declare next_rev integer; m jsonb; old_round public.course_review_rounds; w jsonb; v jsonb; invalidate_only boolean;
begin
 select * into old_round from public.course_review_rounds where id=p_id for update;
 if old_round.id is null or old_round.revision<>p_revision or old_round.status<>'open' then raise exception 'REVIEW_CONFLICT';end if;
 w=p_document->'workflow';v=w->'commercials'->-1;
 if old_round.document->'workflow' is not null then
  if w->>'version' is distinct from '2' then raise exception 'Workflow version required';end if;
  invalidate_only = p_action in ('finding','reopen_report')
    and w = (old_round.document->'workflow') - 'contentApproval'
    and not (w ? 'contentApproval')
    and exists(select 1 from auth.users u,jsonb_array_elements(old_round.document->'participants') p
      where u.id=p_actor and u.email_confirmed_at is not null and lower(u.email)=p->>'email' and p->>'state'<>'declined');
  if old_round.document->'workflow' is distinct from w and not public.v2_is_platform_principal(p_actor) and not invalidate_only then
   if p_action not in ('partner_accept','partner_decline') or not exists(select 1 from auth.users u join public.organisation_memberships m on m.user_id=u.id where u.id=p_actor and u.email_confirmed_at is not null and lower(u.email)=w->>'partnerEmail' and m.organisation_id=coalesce((w->>'partnerCompanyId')::uuid,old_round.organisation_id) and m.membership_role='owner' and m.is_active) then raise exception 'Scoped workflow decision denied';end if;
   if not public.v2_commercial_jointly_approved(v) then raise exception 'Joint APGI approval required before partner decision';end if;
  end if;
  if (w->>'counterOffers')::integer<coalesce((old_round.document#>>'{workflow,counterOffers}')::integer,0) or (w->>'counterOffers')::integer>3 then raise exception 'Counter-offer limit cannot reset';end if;
  if old_round.document#>>'{workflow,stage}'='unresolved' and w->>'stage'<>'unresolved' then raise exception 'Unresolved negotiation cannot reopen';end if;
 end if;
 update public.course_review_rounds set document=p_document,revision=revision+1,plan_id=coalesce((v->>'planId')::uuid,plan_id)
 where id=p_id and revision=p_revision and status='open' returning revision into next_rev;
 insert into public.course_review_history(round_id,revision,actor_id,action,snapshot) values(p_id,next_rev,p_actor,p_action,p_document);
 for m in select * from jsonb_array_elements(p_mail) loop
  insert into public.course_review_mail(round_id,notification_key,recipient,kind,subject,body)
  values(p_id,m->>'key',m->>'to',m->>'kind',m->>'subject',m->>'body') on conflict(notification_key) do nothing;
 end loop;
 return next_rev;
end $function$;
revoke all on function public.v2_commit_course_review(uuid,integer,jsonb,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.v2_commit_course_review(uuid,integer,jsonb,uuid,text,jsonb) to service_role;

-- Keep the full existing publication waterfall and independent checks unchanged.
-- Add a requester identity guard inside the same locked publication transaction.
do $migration$
declare definition text; marker text;
begin
 select pg_get_functiondef('public.v2_publish_reviewed_course(uuid,integer,uuid,text)'::regprocedure) into definition;
 marker := 'select brand_revision into current_brand';
 if position(marker in definition)=0 then raise exception 'Publication guard insertion point changed';end if;
 definition := replace(definition,marker,
  'if r.document->>''requesterId'' is distinct from p_actor::text then raise exception ''Only the review requester may publish'';end if;' || chr(10) || marker);
 execute definition;
end $migration$;
revoke all on function public.v2_publish_reviewed_course(uuid,integer,uuid,text) from public,anon,authenticated;
grant execute on function public.v2_publish_reviewed_course(uuid,integer,uuid,text) to service_role;
