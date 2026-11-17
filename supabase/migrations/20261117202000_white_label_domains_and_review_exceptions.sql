-- Version-bound publication exceptions. Original evidence is never deleted.
alter table public.organisations add column email_from text, add column email_sender_verified boolean not null default false;
create table public.organisation_domains(host text primary key check(host=lower(host) and host ~ '^[a-z0-9.-]+$'),organisation_id uuid not null references public.organisations(id),state text not null default 'pending' check(state in ('pending','active','disabled')),is_primary boolean not null default false,verified_at timestamptz,created_at timestamptz not null default now());
create unique index organisation_primary_domain on public.organisation_domains(organisation_id) where is_primary and state='active';
create table public.course_review_overrides(id uuid primary key,round_id uuid not null references public.course_review_rounds(id),scope text not null check(scope in ('content','commercials','branding')),mode text not null check(mode in ('clear','retain','revoke')),reason text not null check(length(trim(reason)) between 15 and 4000),actor_id uuid not null references auth.users(id),actor_email text not null,fingerprint text not null,brand_revision integer not null,commercial_version text,revokes uuid references public.course_review_overrides(id),snapshot jsonb not null,created_at timestamptz not null default now());
alter table public.organisation_domains enable row level security;
alter table public.course_review_overrides enable row level security;
revoke all on public.organisation_domains,public.course_review_overrides from public,anon,authenticated;
grant all on public.organisation_domains,public.course_review_overrides to service_role;
create function public.v4_review_override_active(d jsonb,scope_name text,fp text,brand integer) returns boolean language sql stable set search_path='' as $$
 with latest as(select value from jsonb_array_elements(coalesce(d->'reviewOverrides','[]'::jsonb)) with ordinality t(value,ord) where value->>'scope'=scope_name and value->>'mode' in ('clear','retain') order by ord desc limit 1)
 select coalesce((select value->>'fingerprint'=fp and not exists(select 1 from jsonb_array_elements(coalesce(d->'reviewOverrides','[]'::jsonb)) x where x->>'revokes'=value->>'id') and (scope_name<>'branding' or (value->>'brandRevision')::integer=brand) and (scope_name<>'commercials' or value->>'commercialVersion' is not distinct from d#>>'{workflow,commercials,-1,id}') from latest),false);
$$;
create function public.v4_apply_review_override(p_id uuid,p_revision integer,p_fingerprint text,p_brand integer,p_actor uuid,p_scope text,p_mode text,p_reason text,p_confirm boolean,p_revoke uuid default null) returns uuid language plpgsql set search_path='' as $$
declare r public.course_review_rounds;bid integer;entry jsonb;key uuid:=gen_random_uuid();mailbox text;v text;
begin
 if not public.v2_is_platform_principal(p_actor) or p_confirm is distinct from true or p_scope not in ('content','commercials','branding') or p_mode not in ('clear','retain','revoke') or length(trim(p_reason)) not between 15 and 4000 then raise exception 'Confirmed principal review exception and reason required';end if;
 select * into r from public.course_review_rounds where id=p_id for update;
 if r.id is null or r.status<>'open' or r.revision<>p_revision or r.fingerprint<>p_fingerprint then raise exception 'Review version changed';end if;
 select brand_revision into bid from public.organisations where id=r.organisation_id and is_active for share;
 if bid is distinct from p_brand then raise exception 'Brand revision changed';end if;
 select lower(email) into mailbox from auth.users where id=p_actor;
 v=r.document#>>'{workflow,commercials,-1,id}';
 if p_mode='revoke' and not exists(select 1 from public.course_review_overrides where id=p_revoke and round_id=p_id and scope=p_scope and mode in ('clear','retain')) then raise exception 'Select a recorded override in this workflow';end if;
 insert into public.course_review_overrides(id,round_id,scope,mode,reason,actor_id,actor_email,fingerprint,brand_revision,commercial_version,revokes,snapshot) values(key,p_id,p_scope,p_mode,trim(p_reason),p_actor,mailbox,p_fingerprint,bid,v,case when p_mode='revoke' then p_revoke end,r.document);
 entry=jsonb_build_object('id',key,'scope',p_scope,'mode',p_mode,'reason',trim(p_reason),'actorId',p_actor,'email',mailbox,'fingerprint',p_fingerprint,'brandRevision',bid,'commercialVersion',v,'at',now());
 if p_mode='revoke' then entry=entry||jsonb_build_object('revokes',p_revoke);end if;
 r.document=jsonb_set(r.document,'{reviewOverrides}',coalesce(r.document->'reviewOverrides','[]'::jsonb)||jsonb_build_array(entry));
 update public.course_review_rounds set document=r.document,revision=revision+1 where id=p_id;
 insert into public.course_review_history(round_id,revision,actor_id,action,snapshot) values(p_id,p_revision+1,p_actor,'review_override_'||p_scope||'_'||p_mode,r.document);
 return key;
end $$;
create function public.v4_review_tasks_ready(d jsonb,brand integer,company uuid,commercial_override boolean,brand_override boolean) returns boolean language plpgsql set search_path='' as $$
declare projected jsonb:=d;people jsonb;
begin
 select coalesce(jsonb_agg(case when p ? 'tasks' then jsonb_set(p,'{tasks}',coalesce((select jsonb_agg(x) from jsonb_array_elements(p->'tasks') x where not (commercial_override and x='"commercials"'::jsonb or brand_override and x='"branding"'::jsonb)),'[]'::jsonb)) else p end),'[]'::jsonb) into people from jsonb_array_elements(d->'participants') p;
 projected=jsonb_set(projected,'{participants}',people);
 if brand_override then projected=jsonb_set(projected,'{workflow,partner}','false'::jsonb);end if;
 return public.v2_review_tasks_ready(projected,brand,company);
end $$;
alter function public.v2_publish_reviewed_course(uuid,integer,uuid,text) rename to v2_publish_reviewed_course_before_overrides;
CREATE OR REPLACE FUNCTION public.v2_publish_reviewed_course(p_id uuid, p_revision integer, p_actor uuid, p_fingerprint text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r public.course_review_rounds; person jsonb; report jsonb; n integer; w jsonb; v jsonb; chosen numeric; costs numeric; administration numeric; reserve numeric; available numeric; recovery numeric; apgi numeric; current_brand integer; oc boolean;om boolean;ob boolean;
begin
 if not public.v2_is_platform_principal(p_actor) then raise exception 'Principal required'; end if;
 select * into r from public.course_review_rounds where id=p_id for update;
 if r.id is null or r.status<>'open' or r.revision<>p_revision or r.fingerprint<>p_fingerprint then raise exception 'Release version changed'; end if;
 if r.document->>'requesterId' is distinct from p_actor::text then raise exception 'Only the review requester may publish';end if;
select brand_revision into current_brand from public.organisations where id=r.organisation_id and is_active for share;
 if current_brand is null then raise exception 'Brand unavailable';end if;
 w=r.document->'workflow';v=w->'commercials'->-1;
 oc=public.v4_review_override_active(r.document,'content',p_fingerprint,current_brand);om=public.v4_review_override_active(r.document,'commercials',p_fingerprint,current_brand);ob=public.v4_review_override_active(r.document,'branding',p_fingerprint,current_brand);
 if w->>'version' is distinct from '2' or (not (oc or om or ob) and w->>'stage' is distinct from 'ready_to_publish') or (not oc and w#>>'{contentApproval,fingerprint}' is distinct from p_fingerprint) then raise exception 'Complete current content-first workflow';end if;
 if not oc and not public.v2_is_platform_principal((w#>>'{contentApproval,userId}')::uuid) then raise exception 'Content principal approval required';end if;
 if not public.v4_review_tasks_ready(r.document,current_brand,r.organisation_id,om,ob) then raise exception 'Current assigned commercial/branding reviews and owner branding sign-off required';end if;
if not om and not public.v2_commercial_jointly_approved(v) then raise exception 'Both current principals must independently approve exact commercials';end if;
 if not exists(select 1 from public.commercial_agreement_drafts p where p.id=(v->>'planId')::uuid and p.course_id=r.course_id and p.organisation_id=r.organisation_id and p.configuration=v->'configuration') then raise exception 'Commercial snapshot mismatch';end if;
 if (w->>'partner')::boolean then
  if not om and (v->'acceptance' is null or v#>>'{acceptance,email}' is distinct from w->>'partnerEmail' or v->>'offeredAt' is null) then raise exception 'Partner terms acceptance required';end if;
  if not oc and v#>>'{acceptance,contentFingerprint}' is distinct from p_fingerprint then raise exception 'Partner current content acceptance required';end if;
  if not ob and (v#>>'{acceptance,brandRevision}')::integer is distinct from current_brand then raise exception 'Partner current branding acceptance required';end if;
  if not om and not exists(select 1 from public.organisation_memberships m join auth.users u on u.id=m.user_id where m.organisation_id=coalesce((w->>'partnerCompanyId')::uuid,r.organisation_id) and m.membership_role='owner' and m.is_active and u.id=(v#>>'{acceptance,userId}')::uuid and lower(u.email)=w->>'partnerEmail' and u.email_confirmed_at is not null) then raise exception 'Verified company owner required';end if;
  chosen=case when om then coalesce((v#>>'{acceptance,price}')::numeric,(v->>'proposedPrice')::numeric) else (v#>>'{acceptance,price}')::numeric end;
 else
  if not ob and (w->>'internalBrandRevision')::integer is distinct from current_brand then raise exception 'Confirm current APGI brand';end if;
  chosen=(v->>'proposedPrice')::numeric;
 end if;
 if chosen is null or chosen<>trunc(chosen) or chosen<(v->>'floor')::numeric or (v->>'floor')::numeric<0 then raise exception 'Price below approved floor';end if;
 -- Repeat the cent-based cost waterfall at publication; a browser quotation is not authority.
 costs=round((v#>>'{configuration,hosting_fixed}')::numeric*100)+round((v#>>'{configuration,stripe_fixed}')::numeric*100)+ceil(chosen*(v#>>'{configuration,hosting_rate}')::numeric/100)+ceil(chosen*(v#>>'{configuration,stripe_rate}')::numeric/100);
 administration=ceil(costs*(v#>>'{configuration,administration_rate}')::numeric/100);
 reserve=ceil(costs*(v#>>'{configuration,contingency_rate}')::numeric/100);
 available=greatest(0,chosen-costs-administration-reserve);
 select (shares.a->>'recovery')::numeric,(shares.a->>'apgi')::numeric into recovery,apgi
 from (select public.v2_commercial_pool_allocation(available,(v#>>'{configuration,apgi_share}')::numeric,
   case when v#>>'{configuration,development_status}'='recover' then (v#>>'{configuration,recovery_rate}')::numeric else 0 end,
   greatest(0,round(((v#>>'{configuration,development_cost}')::numeric-(v#>>'{configuration,already_paid}')::numeric)*100)),
   coalesce(nullif(v#>>'{configuration,recovery_base}',''),'cost_cleared_pool')) a) shares;
 if costs is null or administration is null or reserve is null or apgi is null or chosen<costs+administration+reserve or apgi<round((v#>>'{configuration,minimum_apgi_income}')::numeric*100) then raise exception 'Price does not cover approved costs and APGI minimum income';end if;
 if not oc then
 if r.document->>'reviewProcessVersion'='3' then
   if not public.v3_lu_review_ready(r.document,p_fingerprint) then raise exception 'Complete each LU review and its required explicit or deemed endorsements';end if;
  else
  select count(*) into n from jsonb_array_elements(r.document->'participants') p where p->>'role'='primary' and p->>'state'<>'declined' and public.v2_review_task_assigned(p,'content');
 if n<2 or exists(select 1 from jsonb_array_elements(r.document->'participants') p where p->>'state'='declined') then raise exception 'Reviewer team incomplete'; end if;
 if (select count(distinct p->>'userId') from jsonb_array_elements(r.document->'participants') p where p->>'role'='primary' and p->>'state'='finished' and public.v2_review_task_assigned(p,'content'))<>n then raise exception 'Distinct verified reviewer accounts required';end if;
 for person in select * from jsonb_array_elements(r.document->'participants') p where p->>'role'='primary' and public.v2_review_task_assigned(p,'content') loop
  select value into report from jsonb_array_elements(r.document->'reports') with ordinality t(value,ord) where value->>'email'=person->>'email' order by ord desc limit 1;
  if jsonb_array_length(coalesce(r.document->'contentRevisions','[]'::jsonb))>0 and report->>'fingerprint' is distinct from p_fingerprint then raise exception 'Current deployed version report required';end if;
if person->>'state'<>'finished' or report is null then raise exception 'Report outstanding'; end if;
  if exists(select 1 from jsonb_array_elements(r.document->'units') u where not (report->'coverage' ? (u->>'slug'))) then raise exception 'Unit coverage outstanding'; end if;
  if not exists(select 1 from jsonb_array_elements(report->'endorsements') e where e->>'decision'='approve' and e->>'userId'<>report->>'userId' and e->>'email'<>report->>'email' and exists(select 1 from jsonb_array_elements(r.document->'participants') p where p->>'email'=e->>'email' and p->>'state'<>'declined' and public.v2_review_task_assigned(p,'content'))) or exists(select 1 from jsonb_array_elements(report->'endorsements') e where e->>'decision'='changes') then raise exception 'Peer approval outstanding'; end if;
 end loop;
 end if;
  if r.document->>'reviewProcessVersion' is distinct from '3' and exists(select 1 from jsonb_array_elements(r.document->'findings') f where (f->>'blocking')::boolean and f->>'status'<>'closed') then raise exception 'Blocking findings outstanding'; end if;
 if r.document->>'reviewProcessVersion' is distinct from '3' and jsonb_array_length(coalesce(r.document->'contentRevisions','[]'::jsonb))>0 and exists(select 1 from jsonb_array_elements(r.document->'findings') f where (f->>'blocking')::boolean and not (f ? 'supersededBy') and (f->>'fixedFingerprint' is distinct from p_fingerprint or f->>'verifiedFingerprint' is distinct from p_fingerprint or f->>'fixedBy' is null or f->>'verifiedBy' is null or f->>'fixedBy'=f->>'verifiedBy' or not exists(select 1 from auth.users u,jsonb_array_elements(r.document->'participants') p where u.id::text=f->>'verifiedBy' and u.email_confirmed_at is not null and p->>'userId'=u.id::text and p->>'state'<>'declined'))) then raise exception 'Current corrections require independent verified closure';end if;
end if;
r.document=jsonb_set(r.document,'{workflow,stage}','"published"'::jsonb);
 update public.course_review_rounds set status='published',document=r.document,revision=revision+1 where id=p_id;
 insert into public.course_review_history(round_id,revision,actor_id,action,snapshot) values(p_id,r.revision+1,p_actor,'published',r.document);
 insert into public.organisation_offerings(organisation_id,course_id,status,created_by,reviewed_release_id)
 values(r.organisation_id,r.course_id,'published',p_actor,p_id)
 on conflict(organisation_id,course_id) do update set status='published',reviewed_release_id=p_id,created_by=p_actor;
 insert into public.course_review_mail(round_id,notification_key,recipient,kind,subject,body)
 select p_id,p_id::text||':published:'||recipient,recipient,'published',
  coalesce(r.document#>>'{brand,name}','APGI')||' — '||coalesce(r.document->>'title',r.course_id)||': published',
  'The course offering was explicitly published by an authorised principal. Read the release record for its approvals or recorded review exceptions. Earlier evidence is retained. Learner assessment requirements still apply. Payments remain disabled.'
 from (select p->>'email' recipient from jsonb_array_elements(r.document->'participants') p where p->>'state'<>'declined'
       union select email from public.platform_principals where user_id is not null) recipients
 where recipient is not null on conflict(notification_key) do nothing;
end $function$

;
revoke all on function public.v4_review_override_active(jsonb,text,text,integer) from public,anon,authenticated;
grant execute on function public.v4_review_override_active(jsonb,text,text,integer) to service_role;
revoke all on function public.v4_apply_review_override(uuid,integer,text,integer,uuid,text,text,text,boolean,uuid) from public,anon,authenticated;
grant execute on function public.v4_apply_review_override(uuid,integer,text,integer,uuid,text,text,text,boolean,uuid) to service_role;
revoke all on function public.v4_review_tasks_ready(jsonb,integer,uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function public.v4_review_tasks_ready(jsonb,integer,uuid,boolean,boolean) to service_role;
revoke all on function public.v2_publish_reviewed_course(uuid,integer,uuid,text) from public,anon,authenticated;
grant execute on function public.v2_publish_reviewed_course(uuid,integer,uuid,text) to service_role;
revoke all on function public.v2_publish_reviewed_course_before_overrides(uuid,integer,uuid,text) from public,anon,authenticated;
grant execute on function public.v2_publish_reviewed_course_before_overrides(uuid,integer,uuid,text) to service_role;
