-- Isolated V2 only: approvals remain separate, immutable snapshots are private.
alter table public.course_review_rounds alter column plan_id drop not null;
create function public.v2_commercial_jointly_approved(v jsonb) returns boolean
language sql stable security invoker set search_path='' as $$
 select v is not null and v->>'submittedAt' is not null
 and not exists(select 1 from jsonb_array_elements(coalesce(v->'decisions','[]')) d where d->>'decision'='reject')
 and (select count(distinct p.email) from public.platform_principals p join auth.users u on u.id=p.user_id where u.email_confirmed_at is not null and lower(u.email)=p.email and exists(select 1 from jsonb_array_elements(coalesce(v->'decisions','[]')) d where d->>'email'=p.email and d->>'userId'=p.user_id::text and d->>'decision'='approve'))=2
 and (select count(distinct d->>'userId') from jsonb_array_elements(coalesce(v->'decisions','[]')) d where d->>'decision'='approve')=2;
$$;
create function public.v2_company_owner_exists(p_company uuid,p_email text) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.organisation_memberships m join auth.users u on u.id=m.user_id where m.organisation_id=p_company and m.membership_role='owner' and m.is_active and lower(u.email)=lower(p_email) and u.email_confirmed_at is not null);
$$;
create or replace function public.v2_create_course_review(p_round jsonb,p_actor uuid,p_mail jsonb,p_invites jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare m jsonb;
begin
 if not public.v2_is_platform_principal(p_actor) then raise exception 'Principal required';end if;
 perform pg_advisory_xact_lock(hashtextextended((p_round->>'organisation_id')||':'||(p_round->>'course_id'),0));
 if p_round#>>'{document,workflow,version}' is distinct from '2' or p_round#>>'{document,workflow,stage}' is distinct from 'content_review' or nullif(p_round->>'plan_id','') is not null then raise exception 'Start with course content, without commercials';end if;
 if exists(select 1 from public.course_review_rounds where organisation_id=(p_round->>'organisation_id')::uuid and course_id=p_round->>'course_id' and fingerprint=p_round->>'fingerprint' and status='open') then raise exception 'Review already requested'; end if;
 with superseded as (
  update public.course_review_rounds set status='cancelled',revision=revision+1
  where organisation_id=(p_round->>'organisation_id')::uuid and course_id=p_round->>'course_id' and status='open'
  returning id,revision,document
 ) insert into public.course_review_history(round_id,revision,actor_id,action,snapshot) select id,revision,p_actor,'superseded_by_new_review',document from superseded;
 insert into public.course_review_rounds(id,plan_id,organisation_id,course_id,fingerprint,document)
 values((p_round->>'id')::uuid,(p_round->>'plan_id')::uuid,(p_round->>'organisation_id')::uuid,p_round->>'course_id',p_round->>'fingerprint',p_round->'document');
 insert into public.course_review_history(round_id,revision,actor_id,action,snapshot) values((p_round->>'id')::uuid,1,p_actor,'review_requested',p_round->'document');
 for m in select * from jsonb_array_elements(p_mail) loop
  insert into public.course_review_mail(round_id,notification_key,recipient,kind,subject,body) values((p_round->>'id')::uuid,m->>'key',m->>'to',m->>'kind',m->>'subject',m->>'body');
 end loop;
 for m in select * from jsonb_array_elements(p_invites) loop
  insert into public.course_review_join_tokens(token_hash,round_id,email,expires_at) values(m->>'hash',(p_round->>'id')::uuid,m->>'email',(m->>'expires')::timestamptz);
 end loop;
end $$;

create or replace function public.v2_commit_course_review(p_id uuid,p_revision integer,p_document jsonb,p_actor uuid,p_action text,p_mail jsonb default '[]') returns integer
language plpgsql security invoker set search_path='' as $$
declare next_rev integer; m jsonb; old_round public.course_review_rounds; w jsonb; v jsonb;
begin
 select * into old_round from public.course_review_rounds where id=p_id for update;
 if old_round.id is null or old_round.revision<>p_revision or old_round.status<>'open' then raise exception 'REVIEW_CONFLICT';end if;
 w=p_document->'workflow';v=w->'commercials'->-1;
 if old_round.document->'workflow' is not null then
  if w->>'version' is distinct from '2' then raise exception 'Workflow version required';end if;
  if old_round.document->'workflow' is distinct from w and not public.v2_is_platform_principal(p_actor) then
   if p_action not in ('partner_accept','partner_decline') or not exists(select 1 from auth.users u join public.organisation_memberships m on m.user_id=u.id where u.id=p_actor and u.email_confirmed_at is not null and lower(u.email)=w->>'partnerEmail' and m.organisation_id=old_round.organisation_id and m.membership_role='owner' and m.is_active) then raise exception 'Scoped workflow decision denied';end if;
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
end $$;

create or replace function public.v2_publish_reviewed_course(p_id uuid,p_revision integer,p_actor uuid,p_fingerprint text) returns void
language plpgsql security invoker set search_path='' as $$
declare r public.course_review_rounds; person jsonb; report jsonb; n integer; w jsonb; v jsonb; chosen numeric; costs numeric; administration numeric; reserve numeric; available numeric; recovery numeric; apgi numeric; current_brand integer;
begin
 if not public.v2_is_platform_principal(p_actor) then raise exception 'Principal required'; end if;
 select * into r from public.course_review_rounds where id=p_id for update;
 if r.id is null or r.status<>'open' or r.revision<>p_revision or r.fingerprint<>p_fingerprint then raise exception 'Release version changed'; end if;
 select brand_revision into current_brand from public.organisations where id=r.organisation_id and is_active for share;
 if current_brand is null then raise exception 'Brand unavailable';end if;
 w=r.document->'workflow';v=w->'commercials'->-1;
 if w->>'version' is distinct from '2' or w->>'stage' is distinct from 'ready_to_publish' or w#>>'{contentApproval,fingerprint}' is distinct from p_fingerprint then raise exception 'Complete current content-first workflow';end if;
 if not public.v2_is_platform_principal((w#>>'{contentApproval,userId}')::uuid) then raise exception 'Content principal approval required';end if;
 if not public.v2_commercial_jointly_approved(v) then raise exception 'Both current principals must independently approve exact commercials';end if;
 if not exists(select 1 from public.commercial_agreement_drafts p where p.id=(v->>'planId')::uuid and p.course_id=r.course_id and p.organisation_id=r.organisation_id and p.configuration=v->'configuration') then raise exception 'Commercial snapshot mismatch';end if;
 if (w->>'partner')::boolean then
  if v->'acceptance' is null or v#>>'{acceptance,email}' is distinct from w->>'partnerEmail' or v#>>'{acceptance,contentFingerprint}' is distinct from p_fingerprint or (v#>>'{acceptance,brandRevision}')::integer is distinct from current_brand or v->>'offeredAt' is null then raise exception 'Partner current content, branding and terms acceptance required';end if;
  if not exists(select 1 from public.organisation_memberships m join auth.users u on u.id=m.user_id where m.organisation_id=r.organisation_id and m.membership_role='owner' and m.is_active and u.id=(v#>>'{acceptance,userId}')::uuid and lower(u.email)=w->>'partnerEmail' and u.email_confirmed_at is not null) then raise exception 'Verified company owner required';end if;
  chosen=(v#>>'{acceptance,price}')::numeric;
 else
  if (w->>'internalBrandRevision')::integer is distinct from current_brand then raise exception 'Confirm current APGI brand';end if;
  chosen=(v->>'proposedPrice')::numeric;
 end if;
 if chosen is null or chosen<>trunc(chosen) or chosen<(v->>'floor')::numeric or (v->>'floor')::numeric<0 then raise exception 'Price below approved floor';end if;
 -- Repeat the cent-based cost waterfall at publication; a browser quotation is not authority.
 costs=round((v#>>'{configuration,hosting_fixed}')::numeric*100)+round((v#>>'{configuration,stripe_fixed}')::numeric*100)+ceil(chosen*(v#>>'{configuration,hosting_rate}')::numeric/100)+ceil(chosen*(v#>>'{configuration,stripe_rate}')::numeric/100);
 administration=ceil(costs*(v#>>'{configuration,administration_rate}')::numeric/100);
 reserve=ceil(costs*(v#>>'{configuration,contingency_rate}')::numeric/100);
 available=greatest(0,chosen-costs-administration-reserve);
 recovery=case when v#>>'{configuration,development_status}'='recover' then least(greatest(0,round(((v#>>'{configuration,development_cost}')::numeric-(v#>>'{configuration,already_paid}')::numeric)*100)),floor(available*(v#>>'{configuration,recovery_rate}')::numeric/100)) else 0 end;
 apgi=floor((available-recovery)*(v#>>'{configuration,apgi_share}')::numeric/100);
 if costs is null or administration is null or reserve is null or apgi is null or chosen<costs+administration+reserve or apgi<round((v#>>'{configuration,minimum_apgi_income}')::numeric*100) then raise exception 'Price does not cover approved costs and APGI minimum income';end if;
 select count(*) into n from jsonb_array_elements(r.document->'participants') p where p->>'role'='primary' and p->>'state'<>'declined';
 if n<2 or exists(select 1 from jsonb_array_elements(r.document->'participants') p where p->>'state'='declined') then raise exception 'Reviewer team incomplete'; end if;
 if (select count(distinct p->>'userId') from jsonb_array_elements(r.document->'participants') p where p->>'role'='primary' and p->>'state'='finished')<>n then raise exception 'Distinct verified reviewer accounts required';end if;
 for person in select * from jsonb_array_elements(r.document->'participants') p where p->>'role'='primary' loop
  select value into report from jsonb_array_elements(r.document->'reports') with ordinality t(value,ord) where value->>'email'=person->>'email' order by ord desc limit 1;
  if person->>'state'<>'finished' or report is null then raise exception 'Report outstanding'; end if;
  if exists(select 1 from jsonb_array_elements(r.document->'units') u where not (report->'coverage' ? (u->>'slug'))) then raise exception 'Unit coverage outstanding'; end if;
  if not exists(select 1 from jsonb_array_elements(report->'endorsements') e where e->>'decision'='approve' and e->>'userId'<>report->>'userId' and e->>'email'<>report->>'email' and exists(select 1 from jsonb_array_elements(r.document->'participants') p where p->>'email'=e->>'email' and p->>'state'<>'declined')) or exists(select 1 from jsonb_array_elements(report->'endorsements') e where e->>'decision'='changes') then raise exception 'Peer approval outstanding'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(r.document->'findings') f where (f->>'blocking')::boolean and f->>'status'<>'closed') then raise exception 'Blocking findings outstanding'; end if;
 r.document=jsonb_set(r.document,'{workflow,stage}','"published"'::jsonb);
 update public.course_review_rounds set status='published',document=r.document,revision=revision+1 where id=p_id;
 insert into public.course_review_history(round_id,revision,actor_id,action,snapshot) values(p_id,r.revision+1,p_actor,'published',r.document);
 insert into public.organisation_offerings(organisation_id,course_id,status,created_by,reviewed_release_id)
 values(r.organisation_id,r.course_id,'published',p_actor,p_id)
 on conflict(organisation_id,course_id) do update set status='published',reviewed_release_id=p_id,created_by=p_actor;
end $$;

create or replace function public.v2_review_principal_notice() returns trigger language plpgsql security invoker set search_path='' as $$
declare course text;
begin
 if new.action in ('daily_notification_queue','finding','reply','coverage','fixed','close') then return new;end if;
 select course_id into course from public.course_review_rounds where id=new.round_id;
 insert into public.admin_notifications(recipient_user_id,event_key,kind,course_id,message)
 select user_id,'course-review:'||new.round_id||':'||new.revision,'course_review_event',course,'Course publication update: '||new.action||' — /course-reviews/'||new.round_id
 from public.platform_principals where user_id is not null on conflict(recipient_user_id,event_key) do nothing;
 return new;
end $$;
revoke all on function public.v2_commercial_jointly_approved(jsonb),public.v2_company_owner_exists(uuid,text) from public,anon,authenticated;
grant execute on function public.v2_commercial_jointly_approved(jsonb),public.v2_company_owner_exists(uuid,text) to service_role;
