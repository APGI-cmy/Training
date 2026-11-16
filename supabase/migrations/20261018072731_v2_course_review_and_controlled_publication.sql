-- V2 only. Private workflow data is served through authenticated, scoped server
-- actions; no anon/authenticated REST access or public screenshot bucket.
create table public.course_review_rounds (
 id uuid primary key, plan_id uuid not null references public.commercial_agreement_drafts(id),
 organisation_id uuid not null references public.organisations(id), course_id text not null,
 fingerprint text not null check(length(fingerprint)=64), revision integer not null default 1,
 status text not null default 'open' check(status in ('open','cancelled','published')),
 document jsonb not null, created_at timestamptz not null default now()
);
create index course_review_plan on public.course_review_rounds(plan_id,created_at desc);
create unique index course_review_open_version on public.course_review_rounds(plan_id,fingerprint) where status='open';
alter table public.commercial_agreement_drafts add column save_key text unique;
create table public.course_review_join_tokens (
 token_hash text primary key,round_id uuid not null references public.course_review_rounds(id),email text not null,expires_at timestamptz not null
);
alter table public.course_review_join_tokens enable row level security;
revoke all on public.course_review_join_tokens from anon,authenticated;
grant all on public.course_review_join_tokens to service_role;
create table public.course_review_history (
 id bigint generated always as identity primary key, round_id uuid not null references public.course_review_rounds(id),
 revision integer not null, actor_id uuid, action text not null, snapshot jsonb not null,
 created_at timestamptz not null default now(), unique(round_id,revision)
);
create table public.course_review_mail (
 id uuid primary key default gen_random_uuid(), round_id uuid not null references public.course_review_rounds(id),
 notification_key text not null unique, recipient text not null, kind text not null,
 subject text not null, body text not null, state text not null default 'pending' check(state in ('pending','sending','sent','failed','skipped','attention')),
 attempts integer not null default 0, first_attempt_at timestamptz, locked_at timestamptz,
 provider_id text, last_error text, created_at timestamptz not null default now()
);
create index course_review_mail_queue on public.course_review_mail(state,created_at);
alter table public.course_review_rounds enable row level security;
alter table public.course_review_history enable row level security;
alter table public.course_review_mail enable row level security;
revoke all on public.course_review_rounds,public.course_review_history,public.course_review_mail from anon,authenticated;
grant all on public.course_review_rounds,public.course_review_history,public.course_review_mail to service_role;
grant usage,select on sequence public.course_review_history_id_seq to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('course-review-evidence','course-review-evidence',false,2097152,array['image/png']) on conflict(id) do nothing;

create function public.v2_commit_course_review(p_id uuid,p_revision integer,p_document jsonb,p_actor uuid,p_action text,p_mail jsonb default '[]') returns integer
language plpgsql security invoker set search_path='' as $$
declare next_rev integer; m jsonb;
begin
 update public.course_review_rounds set document=p_document,revision=revision+1
 where id=p_id and revision=p_revision and status='open' returning revision into next_rev;
 if next_rev is null then raise exception 'REVIEW_CONFLICT'; end if;
 insert into public.course_review_history(round_id,revision,actor_id,action,snapshot) values(p_id,next_rev,p_actor,p_action,p_document);
 for m in select * from jsonb_array_elements(p_mail) loop
  insert into public.course_review_mail(round_id,notification_key,recipient,kind,subject,body)
  values(p_id,m->>'key',m->>'to',m->>'kind',m->>'subject',m->>'body') on conflict(notification_key) do nothing;
 end loop;
 return next_rev;
end $$;

create function public.v2_create_course_review(p_round jsonb,p_actor uuid,p_mail jsonb,p_invites jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare m jsonb;
begin
 if not public.v2_is_platform_principal(p_actor) then raise exception 'Principal required';end if;
 perform pg_advisory_xact_lock(hashtextextended((p_round->>'organisation_id')||':'||(p_round->>'course_id'),0));
 if exists(select 1 from public.course_review_rounds where plan_id=(p_round->>'plan_id')::uuid and fingerprint=p_round->>'fingerprint' and status='open') then raise exception 'Review already requested'; end if;
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

alter table public.organisation_offerings add column reviewed_release_id uuid references public.course_review_rounds(id);
create function public.v2_guard_reviewed_offering() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.status='published' and (TG_OP='INSERT' or old.status is distinct from new.status or old.reviewed_release_id is distinct from new.reviewed_release_id) then
  if new.reviewed_release_id is null or not exists(select 1 from public.course_review_rounds r where r.id=new.reviewed_release_id and r.status='published' and r.course_id=new.course_id and r.organisation_id=new.organisation_id) then
   raise exception 'Complete course review and explicit publication approval first';
  end if;
 end if;
 return new;
end $$;
create trigger require_reviewed_course_offering before insert or update on public.organisation_offerings for each row execute function public.v2_guard_reviewed_offering();

create function public.v2_publish_reviewed_course(p_id uuid,p_revision integer,p_actor uuid,p_fingerprint text) returns void
language plpgsql security invoker set search_path='' as $$
declare r public.course_review_rounds; person jsonb; report jsonb; n integer;
begin
 if not public.v2_is_platform_principal(p_actor) then raise exception 'Principal required'; end if;
 select * into r from public.course_review_rounds where id=p_id for update;
 if r.id is null or r.status<>'open' or r.revision<>p_revision or r.fingerprint<>p_fingerprint then raise exception 'Release version changed'; end if;
 if not exists(select 1 from public.organisations o where o.id=r.organisation_id and o.is_active and o.brand_revision=(r.document#>>'{brand,revision}')::integer) then raise exception 'Brand changed'; end if;
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
 if (r.document#>>'{terms,partner}')::boolean and coalesce(r.document#>>'{terms,decision}','')<>'accepted' then raise exception 'Company terms not accepted'; end if;
 update public.course_review_rounds set status='published',revision=revision+1 where id=p_id;
 insert into public.course_review_history(round_id,revision,actor_id,action,snapshot) values(p_id,r.revision+1,p_actor,'published',r.document);
 insert into public.organisation_offerings(organisation_id,course_id,status,created_by,reviewed_release_id)
 values(r.organisation_id,r.course_id,'published',p_actor,p_id)
 on conflict(organisation_id,course_id) do update set status='published',reviewed_release_id=p_id,created_by=p_actor;
end $$;

create function public.v2_claim_review_mail() returns setof public.course_review_mail
language plpgsql security invoker set search_path='' as $$
begin
 -- Provider idempotency lasts 24h. Uncertain older attempts need operator review.
 update public.course_review_mail set state='attention',last_error='Provider result uncertain beyond retry window'
 where state in ('sending','failed') and first_attempt_at < now()-interval '23 hours';
 return query update public.course_review_mail set state='sending',locked_at=now(),first_attempt_at=coalesce(first_attempt_at,now()),attempts=attempts+1
 where id in(select id from public.course_review_mail where state in ('pending','failed') or (state='sending' and locked_at<now()-interval '10 minutes') order by created_at for update skip locked limit 10) returning *;
end $$;
revoke all on function public.v2_commit_course_review(uuid,integer,jsonb,uuid,text,jsonb),public.v2_publish_reviewed_course(uuid,integer,uuid,text),public.v2_claim_review_mail(),public.v2_create_course_review(jsonb,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.v2_commit_course_review(uuid,integer,jsonb,uuid,text,jsonb),public.v2_publish_reviewed_course(uuid,integer,uuid,text),public.v2_claim_review_mail(),public.v2_create_course_review(jsonb,uuid,jsonb,jsonb) to service_role;
revoke all on function public.v2_guard_reviewed_offering() from public,anon,authenticated;
