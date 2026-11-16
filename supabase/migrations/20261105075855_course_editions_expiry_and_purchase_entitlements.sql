-- Additive delivery controls. No existing expiry, review or price is changed.
create table public.course_editions (
 id uuid primary key default gen_random_uuid(),
 course_id text not null references public.courses(id),
 runtime_course_id text not null unique references public.courses(id),
 edition_number integer not null check (edition_number>0),
 runtime_slug text not null unique,
 content_hash text not null check(content_hash ~ '^[a-f0-9]{64}$'),
 course_document jsonb not null check(jsonb_typeof(course_document)='object'),
 source_commit text not null check(source_commit ~ '^[a-f0-9]{40}$'),
 state text not null default 'staging' check(state in ('staging','ready')),
 file_count integer not null check(file_count>0),
 byte_count bigint not null check(byte_count>0),
 created_at timestamptz not null default now(),
 verified_at timestamptz,
 unique(course_id,edition_number),unique(course_id,content_hash)
);
create table public.course_edition_assets (
 edition_id uuid not null references public.course_editions(id),
 path text not null check(path like '/courses/%' and path !~ '(\\\\|(^|/)\.\.?(/|$)|[[:cntrl:]])'),
 byte_count bigint not null check(byte_count>=0),
 content_hash text not null check(content_hash ~ '^[a-f0-9]{64}$'),
 content_type text not null,
 segments jsonb not null check(jsonb_typeof(segments)='array'),
 primary key(edition_id,path)
);
create table public.course_delivery_editions (
 course_id text primary key references public.courses(id),
 edition_id uuid not null references public.course_editions(id),
 updated_at timestamptz not null default now()
);
alter table public.course_enrolments add column edition_id uuid references public.course_editions(id);
alter table public.course_enrolments add column access_expires_at timestamptz;
create index course_enrolments_edition_user on public.course_enrolments(edition_id,user_id);

create table public.course_purchase_offers (
 id uuid primary key default gen_random_uuid(),
 edition_id uuid not null references public.course_editions(id),
 organisation_id uuid references public.organisations(id),
 kind text not null check(kind in ('ebook','refresher')),
 title text not null,
 amount_cents integer not null default 1000 check(amount_cents>0),
 currency text not null default 'USD' check(currency ~ '^[A-Z]{3}$'),
 minimum_cents integer not null check(minimum_cents>0),
 discount_bps integer not null default 0 check(discount_bps between 0 and 9900),
 access_days integer check(access_days between 1 and 3650),
 ebook_paths text[] not null default '{}',
 download_rights_confirmed boolean not null default false,
 valid_until timestamptz not null,
 enabled boolean not null default false,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 check(amount_cents>=minimum_cents),
 check((kind='ebook' and cardinality(ebook_paths)>0 and discount_bps=0 and access_days is null and download_rights_confirmed) or
       (kind='refresher' and cardinality(ebook_paths)=0 and access_days is not null))
);
create table public.course_purchase_orders (
 id uuid primary key default gen_random_uuid(),
 offer_id uuid not null references public.course_purchase_offers(id),
 buyer_id uuid not null references auth.users(id),
 edition_id uuid not null references public.course_editions(id),
 amount_cents integer not null check(amount_cents>0),
 currency text not null,
 kind text not null check(kind in ('ebook','refresher')),
 offer_snapshot jsonb not null,
 state text not null default 'pending' check(state in ('pending','checkout','fulfilled','refunded','reconciliation')),
 checkout_id text unique,
 payment_intent text unique,
 verified_event_id text unique,
 mode text not null default 'test' check(mode in ('test','live')),
 paid_at timestamptz,
 created_at timestamptz not null default now()
);
create unique index course_purchase_one_pending on public.course_purchase_orders(buyer_id,offer_id) where state in ('pending','checkout');
create table public.course_purchase_entitlements (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null unique references public.course_purchase_orders(id),
 user_id uuid not null references auth.users(id),
 edition_id uuid not null references public.course_editions(id),
 kind text not null check(kind in ('ebook','refresher')),
 ebook_paths text[] not null default '{}',
 state text not null default 'active' check(state in ('active','revoked')),
 mode text not null check(mode in ('test','live')),
 created_at timestamptz not null default now(),
 unique(user_id,edition_id,kind,mode)
);
create table public.course_delivery_events (
 id bigint generated always as identity primary key,
 actor_id uuid references auth.users(id),
 course_id text references public.courses(id),
 event_type text not null,
 detail jsonb not null default '{}',
 occurred_at timestamptz not null default now()
);

-- Metadata is read through session-bound server services. Never client-writable.
do $$declare t text;begin
 foreach t in array array['course_editions','course_edition_assets','course_delivery_editions','course_purchase_offers','course_purchase_orders','course_purchase_entitlements','course_delivery_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  execute format('create policy server_only on public.%I for all to authenticated using(false) with check(false)',t);
 end loop;
end$$;
grant usage,select on sequence public.course_delivery_events_id_seq to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('course-edition-blocks','course-edition-blocks',false,16777216,array['application/octet-stream']) on conflict(id) do nothing;

create function public.v3_immutable_edition() returns trigger language plpgsql set search_path='' as $$begin
 if tg_table_name='course_editions' and old.state='staging' and new.state='ready'
 and (to_jsonb(old)-'state'-'verified_at')=(to_jsonb(new)-'state'-'verified_at') then return new;end if;
 raise exception 'EDITION_IMMUTABLE';
end$$;
create trigger immutable_edition before update or delete on public.course_editions for each row execute function public.v3_immutable_edition();
create function public.v3_immutable_edition_asset() returns trigger language plpgsql set search_path='' as $$begin
 if exists(select 1 from public.course_editions where id=coalesce(new.edition_id,old.edition_id) and state='ready') then raise exception 'EDITION_ASSETS_IMMUTABLE';end if;
 if tg_op='DELETE' then return old;end if;return new;
end$$;
create trigger immutable_edition_assets before insert or update or delete on public.course_edition_assets for each row execute function public.v3_immutable_edition_asset();

create function public.v3_finish_course_edition(p_edition uuid,p_baseline boolean default false) returns void
 language plpgsql set search_path='' as $$declare e public.course_editions;begin
 select * into e from public.course_editions where id=p_edition for update;
 if not found then raise exception 'EDITION_NOT_FOUND';end if;
 if (select count(*) from public.course_edition_assets where edition_id=e.id)<>e.file_count
 or (select coalesce(sum(byte_count),0) from public.course_edition_assets where edition_id=e.id)<>e.byte_count then raise exception 'EDITION_INCOMPLETE';end if;
 if e.state='staging' then update public.course_editions set state='ready',verified_at=now() where id=e.id;end if;
 if p_baseline then
  if e.edition_number<>1 or e.runtime_course_id<>e.course_id then raise exception 'BASELINE_ONLY';end if;
  insert into public.course_delivery_editions(course_id,edition_id) values(e.course_id,e.id) on conflict(course_id) do nothing;
  if not exists(select 1 from public.course_delivery_editions where course_id=e.course_id and edition_id=e.id) then raise exception 'BASELINE_ALREADY_REGISTERED';end if;
  update public.course_enrolments set edition_id=e.id where course_id=e.runtime_course_id and edition_id is null;
 end if;
 insert into public.course_delivery_events(course_id,event_type,detail) values(e.course_id,'edition_verified',jsonb_build_object('edition',e.id,'baseline',p_baseline,'files',e.file_count));
end$$;

create function public.v3_pin_enrolment_edition() returns trigger language plpgsql set search_path='' as $$declare e public.course_editions;begin
 if tg_op='UPDATE' and old.edition_id is not null and new.edition_id is distinct from old.edition_id then raise exception 'EXISTING_EDITION_CANNOT_BE_REPLACED';end if;
 if new.edition_id is null then select d.* into e from public.course_delivery_editions p join public.course_editions d on d.id=p.edition_id where p.course_id=new.course_id and d.state='ready';new.edition_id=e.id;
 else select * into e from public.course_editions where id=new.edition_id;
  if e.state<>'ready' or e.runtime_course_id<>new.course_id then raise exception 'ENROLMENT_EDITION_MISMATCH';end if;
 end if;return new;
end$$;
create trigger pin_enrolment_edition before insert or update on public.course_enrolments for each row execute function public.v3_pin_enrolment_edition();

-- Enforce the same deadline on direct learner writes, not just page navigation.
create function public.v3_guard_learning_write() returns trigger language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from public.course_enrolments e where e.course_id=new.course_id and e.user_id=new.user_id and e.status='enrolled'
 and (e.access_expires_at is null or e.access_expires_at>now())) then raise exception 'ACTIVE_COURSE_ACCESS_REQUIRED';end if;
 return new;
end$$;
do $$declare t text;begin foreach t in array array['progress_events','learner_progress','completion_states','scorm_attempts'] loop
 execute format('create trigger enforce_course_expiry before insert or update on public.%I for each row execute function public.v3_guard_learning_write()',t);
end loop;end$$;

-- A verified webhook is the only fulfilment entry point. Test orders never
-- create real course access. A refund revokes purchases, never deletes history.
create function public.v3_fulfil_course_purchase(p_order uuid,p_event text,p_checkout text,p_intent text,p_amount integer,p_currency text,p_live boolean)
 returns uuid language plpgsql set search_path='' as $$
declare o public.course_purchase_orders;e public.course_editions;ent uuid;begin
 select * into o from public.course_purchase_orders where id=p_order for update;
 if not found or o.checkout_id is distinct from p_checkout or o.amount_cents<>p_amount or o.currency<>upper(p_currency)
 or o.mode<>(case when p_live then 'live' else 'test' end) or p_event !~ '^evt_[A-Za-z0-9]+$' or p_intent !~ '^pi_[A-Za-z0-9]+$' then raise exception 'PAYMENT_CONFIRMATION_MISMATCH';end if;
 if o.state='fulfilled' then
  if o.payment_intent is distinct from p_intent then raise exception 'PAYMENT_INTENT_CHANGED';end if;
  select id into ent from public.course_purchase_entitlements where order_id=o.id;return ent;
 end if;
 if o.state not in ('pending','checkout') then raise exception 'ORDER_NOT_FULFILLABLE';end if;
 select * into e from public.course_editions where id=o.edition_id and state='ready';if not found then raise exception 'EDITION_NOT_READY';end if;
 -- A refresher must have its own course/attempt identity. Reusing the old
 -- course key would overwrite original SCORM/progress records.
 if o.kind='refresher' and (e.runtime_course_id=e.course_id or exists(select 1 from public.course_enrolments where user_id=o.buyer_id and course_id=e.runtime_course_id)) then raise exception 'FRESH_ATTEMPT_REQUIRED';end if;
 insert into public.course_purchase_entitlements(order_id,user_id,edition_id,kind,ebook_paths,mode)
 values(o.id,o.buyer_id,o.edition_id,o.kind,array(select jsonb_array_elements_text(o.offer_snapshot->'ebook_paths')),o.mode) returning id into ent;
 if p_live and o.kind='refresher' then
  insert into public.course_enrolments(user_id,course_id,status,source,access_granted_at,edition_id,access_expires_at,organisation_id,metadata)
  values(o.buyer_id,e.runtime_course_id,'enrolled','payment',now(),e.id,now()+make_interval(days=>(o.offer_snapshot->>'access_days')::integer),(o.offer_snapshot->>'organisation_id')::uuid,jsonb_build_object('purchase_order',o.id,'course_family',e.course_id));
 end if;
 update public.course_purchase_orders set state='fulfilled',payment_intent=p_intent,verified_event_id=p_event,paid_at=now() where id=o.id;
 insert into public.course_delivery_events(actor_id,course_id,event_type,detail) values(o.buyer_id,e.course_id,'purchase_fulfilled',jsonb_build_object('order',o.id,'kind',o.kind,'mode',o.mode));return ent;
end$$;
create function public.v3_refund_course_purchase(p_intent text) returns void language plpgsql set search_path='' as $$declare o public.course_purchase_orders;begin
 for o in select * from public.course_purchase_orders where payment_intent=p_intent for update loop
  update public.course_purchase_orders set state='refunded' where id=o.id;
  update public.course_purchase_entitlements set state='revoked' where order_id=o.id;
  if o.kind='refresher' and o.mode='live' then update public.course_enrolments set status='revoked',access_revoked_at=now() where user_id=o.buyer_id and metadata->>'purchase_order'=o.id::text;end if;
 end loop;end$$;
create function public.v3_prepare_course_purchase(p_actor uuid,p_offer uuid) returns jsonb language plpgsql set search_path='' as $$
declare f public.course_purchase_offers;e public.course_editions;o public.course_purchase_orders;price integer;begin
 if not public.v2_is_platform_principal(p_actor) then raise exception 'SANDBOX_PRINCIPAL_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text||':'||p_offer::text,0));
 select * into f from public.course_purchase_offers where id=p_offer;
 if not found or f.valid_until<=now() then raise exception 'OFFER_EXPIRED';end if;
 select * into e from public.course_editions where id=f.edition_id and state='ready';
 if not found then raise exception 'EDITION_NOT_READY';end if;
 if not exists(select 1 from public.course_enrolments n join public.course_editions old on old.id=n.edition_id where n.user_id=p_actor and old.course_id=e.course_id and (f.organisation_id is null or n.organisation_id=f.organisation_id)) then raise exception 'PRIOR_ENROLMENT_REQUIRED';end if;
 if f.kind='refresher' and e.runtime_course_id=e.course_id then raise exception 'FRESH_ATTEMPT_REQUIRED';end if;
 price=round(f.amount_cents::numeric*(10000-f.discount_bps)/10000)::integer;
 if price<f.minimum_cents or price<=0 then raise exception 'BELOW_APPROVED_MINIMUM';end if;
 if exists(select 1 from public.course_purchase_entitlements where user_id=p_actor and edition_id=e.id and kind=f.kind and mode='test') then raise exception 'ALREADY_PURCHASED';end if;
 select * into o from public.course_purchase_orders where buyer_id=p_actor and offer_id=f.id and state in ('pending','checkout');
 if not found then
  insert into public.course_purchase_orders(offer_id,buyer_id,edition_id,amount_cents,currency,kind,offer_snapshot,mode)
  values(f.id,p_actor,e.id,price,f.currency,f.kind,to_jsonb(f),'test') returning * into o;
 end if;return to_jsonb(o);
end$$;
create function public.v3_set_course_access_expiry(p_actor uuid,p_enrolment uuid,p_expiry timestamptz,p_reason text) returns void language plpgsql set search_path='' as $$
declare e public.course_enrolments;begin
 if not public.v2_is_platform_principal(p_actor) or length(trim(coalesce(p_reason,'')))<10 or length(p_reason)>2000 or p_expiry is null then raise exception 'EXPLICIT_EXPIRY_AND_REASON_REQUIRED';end if;
 select * into e from public.course_enrolments where id=p_enrolment for update;if not found then raise exception 'ENROLMENT_NOT_FOUND';end if;
 update public.course_enrolments set access_expires_at=p_expiry where id=e.id;
 insert into public.course_delivery_events(actor_id,course_id,event_type,detail) values(p_actor,e.course_id,'access_expiry_recorded',jsonb_build_object('enrolment',e.id,'previous',e.access_expires_at,'expiry',p_expiry,'reason',trim(p_reason)));
end$$;
-- No browser can call registration, fulfilment, refund or trigger helpers.
do $$declare f record;begin for f in select p.oid::regprocedure as name from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('v3_immutable_edition','v3_immutable_edition_asset','v3_finish_course_edition','v3_pin_enrolment_edition','v3_guard_learning_write','v3_fulfil_course_purchase','v3_refund_course_purchase','v3_prepare_course_purchase','v3_set_course_access_expiry') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.name);
 execute format('grant execute on function %s to service_role',f.name);
end loop;end$$;

-- Preserve the existing verified-session, MFA and review preview checks while
-- adding expiry. This is the only change to the established asset predicate.
do $$declare definition text;begin
 definition=pg_get_functiondef('course_access_private.v2_course_asset_access(text)'::regprocedure);
 if position('course_id=p_course and status=''enrolled''' in definition)=0 then raise exception 'UNEXPECTED_ASSET_ACCESS_DEFINITION';end if;
 definition=replace(definition,'course_id=p_course and status=''enrolled''','course_id=p_course and status=''enrolled'' and (access_expires_at is null or access_expires_at>now())');
 execute definition;
end$$;
create function course_access_private.v3_course_asset_route(p_course text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();mailbox text;edition uuid;begin
 if not course_access_private.v2_course_asset_access(p_course) then return null;end if;
 select lower(email) into mailbox from auth.users where id=actor;
 if exists(select 1 from public.user_roles where user_id=actor and role='admin') or exists(
  select 1 from public.course_review_rounds r cross join lateral jsonb_array_elements(coalesce(r.document->'participants','[]'::jsonb)) p where r.course_id=p_course and r.status in ('open','published') and lower(p->>'email')=mailbox and coalesce(p->>'state','')<>'declined'
 ) then return jsonb_build_object('preview',true);end if;
 select edition_id into edition from public.course_enrolments where user_id=actor and course_id=p_course and status='enrolled' and (access_expires_at is null or access_expires_at>now());
 if edition is not null then return jsonb_build_object('editionId',edition);end if;
 -- Only a not-yet-migrated course may use its legacy files. Once a baseline
 -- exists a missing pin is an error, never permission to use a mutable draft.
 if not exists(select 1 from public.course_delivery_editions where course_id=p_course) then return jsonb_build_object('preview',true);end if;
 return null;
end$$;
create function public.v3_course_asset_route(p_course text) returns jsonb language sql stable set search_path='' as $$select course_access_private.v3_course_asset_route(p_course);$$;
revoke all on function course_access_private.v3_course_asset_route(text),public.v3_course_asset_route(text) from public,anon;
grant execute on function course_access_private.v3_course_asset_route(text),public.v3_course_asset_route(text) to authenticated,service_role;
