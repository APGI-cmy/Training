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
 insert into public.course_review_mail(round_id,notification_key,recipient,kind,subject,body)
 select p_id,p_id::text||':published:'||recipient,recipient,'published',
  coalesce(r.document#>>'{brand,name}','APGI')||' — '||coalesce(r.document->>'title',r.course_id)||': published',
  'The reviewed course offering completed content, commercial and branding approval and was explicitly published by an APGI principal. Open the secure course-review workspace for the release record. Payment-dependent enrolment requires an enabled platform-managed payment route. V2 payments remain disabled. Hosted by APGI.'
 from (select p->>'email' recipient from jsonb_array_elements(r.document->'participants') p where p->>'state'<>'declined'
       union select email from public.platform_principals where user_id is not null) recipients
 where recipient is not null on conflict(notification_key) do nothing;
end $$;


