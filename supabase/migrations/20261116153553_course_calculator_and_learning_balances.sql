-- Additive, V2-only calculator. Existing prices, approvals, payments and learner
-- records are deliberately not updated. All mutations are service-role only;
-- server actions authenticate the caller and these RPCs repeat actor checks.
create table public.cc_cost_versions (
 id uuid primary key default gen_random_uuid(), snapshot jsonb not null,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.cc_credit_versions (
 id uuid primary key default gen_random_uuid(), edition_id uuid not null references public.course_editions(id),
 owner_id uuid not null references public.organisations(id), snapshot jsonb not null,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create index cc_credit_edition_idx on public.cc_credit_versions(edition_id,created_at desc);
create table public.cc_policy_versions (
 id uuid primary key default gen_random_uuid(), version text not null unique, body text not null,
 body_hash text not null, created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.cc_policy_decisions (
 policy_id uuid not null references public.cc_policy_versions(id), actor_id uuid not null references auth.users(id),
 decision text not null check(decision in ('approve','reject')), reason text not null,
 created_at timestamptz not null default now(), primary key(policy_id,actor_id)
);
create table public.cc_policy_activations (
 policy_id uuid primary key references public.cc_policy_versions(id), effective_at timestamptz not null default now(),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.cc_quotes (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.organisations(id),
 policy_id uuid not null references public.cc_policy_versions(id), created_by uuid not null references auth.users(id),
 input jsonb not null, result jsonb not null, courses jsonb not null, cost_snapshot jsonb not null,
 fingerprint text not null, created_at timestamptz not null default now()
);
create index cc_quotes_company_idx on public.cc_quotes(company_id,created_at desc);
create table public.cc_quote_decisions (
 quote_id uuid not null references public.cc_quotes(id), actor_id uuid not null references auth.users(id),
 decision text not null check(decision in ('approve','reject')), reason text not null,
 created_at timestamptz not null default now(), primary key(quote_id,actor_id)
);
create table public.cc_orders (
 id uuid primary key default gen_random_uuid(), quote_id uuid not null references public.cc_quotes(id),
 buyer_id uuid not null references auth.users(id), company_id uuid not null references public.organisations(id),
 mode text not null default 'test' check(mode='test'), state text not null default 'pending' check(state in ('pending','checkout','funded','held','refunded')),
 checkout_id text unique, payment_intent text unique, event_id text unique,
 amount_cents bigint not null check(amount_cents>0), currency text not null, fee_evidence jsonb, hold_reason text,
 funded_at timestamptz, created_at timestamptz not null default now(), unique(quote_id,buyer_id)
);
create index cc_orders_company_idx on public.cc_orders(company_id,created_at desc);
create table public.cc_seats (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.cc_orders(id), position integer not null check(position>0),
 learner_id uuid references auth.users(id), assigned_at timestamptz,
 credit_units bigint not null check(credit_units>0), course_limit integer not null check(course_limit>0),
 content_cents bigint not null check(content_cents>=0), expires_at timestamptz not null,
 state text not null default 'active' check(state in ('active','held','refunded')),
 unique(order_id,position),unique(order_id,learner_id)
);
create index cc_seats_learner_idx on public.cc_seats(learner_id,expires_at);
create table public.cc_redemptions (
 id uuid primary key default gen_random_uuid(), seat_id uuid not null references public.cc_seats(id),
 order_id uuid not null references public.cc_orders(id), currency text not null,
 edition_id uuid not null references public.course_editions(id), credit_units bigint not null check(credit_units>0),
 content_cents bigint not null check(content_cents>=0), owner_id uuid not null references public.organisations(id),
 seller_id uuid not null references public.organisations(id), owner_cents bigint not null,seller_cents bigint not null,apgi_cents bigint not null,
 mode text not null default 'test' check(mode='test'), created_at timestamptz not null default now(),
 unique(seat_id,edition_id), check(owner_cents>=0 and seller_cents>=0 and apgi_cents>=0 and owner_cents+seller_cents+apgi_cents=content_cents)
);
create table public.cc_balance_events (
 id bigint generated always as identity primary key, seat_id uuid not null references public.cc_seats(id),
 kind text not null check(kind in ('fund','redeem','hold','refund')), units bigint not null,
 amount_cents bigint not null, reference text not null, created_at timestamptz not null default now(), unique(seat_id,kind,reference)
);
create index cc_redemptions_owner_idx on public.cc_redemptions(owner_id,created_at desc);
create index cc_redemptions_seller_idx on public.cc_redemptions(seller_id,created_at desc);
create index cc_redemptions_order_idx on public.cc_redemptions(order_id);
create index cc_balance_events_seat_idx on public.cc_balance_events(seat_id,id);

create function public.cc_can_manage(p_actor uuid,p_company uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from auth.users where id=p_actor and email_confirmed_at is not null)
 and (public.v2_is_platform_principal(p_actor) or exists(select 1 from public.organisation_memberships where user_id=p_actor and organisation_id=p_company and is_active and membership_role='owner'));
$$;
create function public.cc_company_members(p_actor uuid,p_company uuid) returns table(id uuid,email text) language sql stable set search_path='' as $$
 select u.id,u.email::text from auth.users u where u.email_confirmed_at is not null
 and public.cc_can_manage(p_actor,p_company) and (u.id=p_actor or exists(select 1 from public.organisation_memberships m where m.organisation_id=p_company and m.user_id=u.id and m.is_active));
$$;
create function public.cc_policy_approved(p_policy uuid) returns boolean language sql stable set search_path='' as $$
 select (select count(*) from public.platform_principals)=2 and
 (select count(*) from public.cc_policy_decisions where policy_id=p_policy and decision='approve' and public.v2_is_platform_principal(actor_id))=2;
$$;
create function public.cc_policy_ready(p_policy uuid) returns boolean language sql stable set search_path='' as $$
 select public.cc_policy_approved(p_policy) and exists(select 1 from public.cc_policy_activations where policy_id=p_policy and effective_at<=now());
$$;
create function public.cc_activate_policy(p_actor uuid,p_policy uuid) returns void language plpgsql set search_path='' as $$
begin
 if not public.v2_is_platform_principal(p_actor) or not public.cc_policy_approved(p_policy) then raise exception 'Both exact policy approvals required';end if;
 insert into public.cc_policy_activations(policy_id,created_by) values(p_policy,p_actor) on conflict do nothing;
end;$$;
create function public.cc_quote_ready(p_quote uuid) returns boolean language sql stable set search_path='' as $$
 select public.cc_policy_ready(q.policy_id) and
 (select count(*) from public.cc_quote_decisions where quote_id=q.id and decision='approve' and public.v2_is_platform_principal(actor_id))=2
 from public.cc_quotes q where q.id=p_quote;
$$;
create function public.cc_record_decision(p_actor uuid,p_kind text,p_id uuid,p_decision text,p_reason text) returns void language plpgsql set search_path='' as $$
begin
 if not public.v2_is_platform_principal(p_actor) or p_decision not in ('approve','reject') or length(p_reason)<5 then raise exception 'Verified principal and recorded reason required'; end if;
 if p_kind='policy' then
  insert into public.cc_policy_decisions(policy_id,actor_id,decision,reason) values(p_id,p_actor,p_decision,p_reason);
 elsif p_kind='quote' then
  if not public.cc_policy_ready((select policy_id from public.cc_quotes where id=p_id)) then raise exception 'Both policy approvals required first';end if;
  insert into public.cc_quote_decisions(quote_id,actor_id,decision,reason) values(p_id,p_actor,p_decision,p_reason);
 else raise exception 'Invalid decision type';end if;
end;$$;
create function public.cc_prepare_policy(p_actor uuid,p_version text,p_body text,p_hash text) returns public.cc_policy_versions language plpgsql set search_path='' as $$
declare p public.cc_policy_versions;
begin
 if not public.v2_is_platform_principal(p_actor) or length(p_body)<100 or length(p_body)>50000 or length(p_version)>100 then raise exception 'Verified principal and policy body required';end if;
 insert into public.cc_policy_versions(version,body,body_hash,created_by) values(p_version,p_body,p_hash,p_actor) on conflict(version) do nothing;
 select * into p from public.cc_policy_versions where version=p_version;
 if p.body_hash<>p_hash then raise exception 'A changed body requires a new policy version';end if;
 return p;
end;$$;

create function public.cc_prepare_order(p_actor uuid,p_quote uuid) returns public.cc_orders language plpgsql set search_path='' as $$
declare q public.cc_quotes; o public.cc_orders;
begin
 select * into q from public.cc_quotes where id=p_quote;
 if not found or not public.cc_can_manage(p_actor,q.company_id) or not coalesce(public.cc_quote_ready(q.id),false) then raise exception 'Approved exact quote and company authority required';end if;
 insert into public.cc_orders(quote_id,buyer_id,company_id,amount_cents,currency) values(q.id,p_actor,q.company_id,(q.result->>'totalCents')::bigint,q.result->>'currency') on conflict(quote_id,buyer_id) do nothing;
 select * into o from public.cc_orders where quote_id=q.id and buyer_id=p_actor;
 if o.state not in ('pending','checkout') then raise exception 'Existing payment requires attention';end if;
 return o;
end;$$;

create function public.cc_fund_order(p_order uuid,p_checkout text,p_intent text,p_event text,p_amount bigint,p_currency text,p_live boolean) returns void language plpgsql set search_path='' as $$
declare o public.cc_orders; q public.cc_quotes; seats integer; units bigint; cents bigint; s uuid; i integer;
begin
 select * into o from public.cc_orders where id=p_order for update;
 if not found or p_live is distinct from false or o.mode<>'test' or o.checkout_id is distinct from p_checkout or o.amount_cents<>p_amount or lower(o.currency)<>lower(p_currency) then raise exception 'Sandbox payment mismatch';end if;
 if o.state='funded' then if o.payment_intent=p_intent then return;else raise exception 'Payment identity mismatch';end if;end if;
 if o.state not in ('pending','checkout') then raise exception 'Order is held';end if;
 select * into q from public.cc_quotes where id=o.quote_id;
 if not coalesce(public.cc_quote_ready(q.id),false) then raise exception 'Approval not current';end if;
 seats=(q.input->>'seats')::integer;units=(q.result->>'units')::bigint;cents=(q.result->>'contentCents')::bigint;
 for i in 1..seats loop
  insert into public.cc_seats(order_id,position,credit_units,course_limit,content_cents,expires_at)
  values(o.id,i,units,(q.input->>'courseCap')::integer,cents/seats+case when i<=cents%seats then 1 else 0 end,now()+make_interval(months=>(q.input->>'months')::integer)) returning id into s;
  insert into public.cc_balance_events(seat_id,kind,units,amount_cents,reference) values(s,'fund',units,cents/seats+case when i<=cents%seats then 1 else 0 end,p_intent);
 end loop;
 update public.cc_orders set state='funded',funded_at=now(),payment_intent=p_intent,event_id=p_event where id=o.id;
end;$$;

create function public.cc_assign_seat(p_actor uuid,p_seat uuid,p_learner uuid) returns void language plpgsql set search_path='' as $$
declare s public.cc_seats;o public.cc_orders;
begin
 select * into s from public.cc_seats where id=p_seat for update;
 select * into o from public.cc_orders where id=s.order_id;
 if not public.cc_can_manage(p_actor,o.company_id) or o.state<>'funded' or s.state<>'active' or s.expires_at<=now() then raise exception 'Active funded seat and company authority required';end if;
 if s.learner_id=p_learner then return;end if;
 if s.learner_id is not null then raise exception 'An assigned seat cannot be silently transferred';end if;
 if not exists(select 1 from auth.users where id=p_learner and email_confirmed_at is not null) or
 not (p_learner=o.buyer_id or exists(select 1 from public.organisation_memberships where organisation_id=o.company_id and user_id=p_learner and is_active)) then raise exception 'Choose a verified company member';end if;
 update public.cc_seats set learner_id=p_learner,assigned_at=now() where id=p_seat;
end;$$;

create function public.cc_redeem(p_actor uuid,p_seat uuid,p_edition uuid) returns public.cc_redemptions language plpgsql set search_path='' as $$
declare s public.cc_seats;o public.cc_orders;q public.cc_quotes;c jsonb;r public.cc_redemptions;used bigint;usedc bigint;countc integer;units bigint;amount bigint;ownerbps integer;sellerbps integer;ownerc bigint;sellerc bigint;apgi uuid;
begin
 select * into s from public.cc_seats where id=p_seat for update;
 select * into o from public.cc_orders where id=s.order_id;
 if s.learner_id is distinct from p_actor or o.state<>'funded' or s.state<>'active' or s.expires_at<=now() then raise exception 'Active assigned learner entitlement required';end if;
 select * into r from public.cc_redemptions where seat_id=s.id and edition_id=p_edition;
 if found then return r;end if;
 select * into q from public.cc_quotes where id=o.quote_id;
 select value into c from jsonb_array_elements(q.courses) where value->>'editionId'=p_edition::text;
 if c is null then raise exception 'Course is outside this approved allowance';end if;
 units=round((c->>'hours')::numeric*100000)::bigint;
 select coalesce(sum(credit_units),0),coalesce(sum(content_cents),0),count(*) into used,usedc,countc from public.cc_redemptions where seat_id=s.id;
 if used+units>s.credit_units or countc>=s.course_limit then raise exception 'Learning balance or course limit exceeded';end if;
 amount=case when used+units=s.credit_units then s.content_cents-usedc else floor(s.content_cents::numeric*units/s.credit_units)::bigint end;
 if amount<(c->>'minimumCents')::bigint then raise exception 'Owner minimum price is not covered';end if;
 select id into apgi from public.organisations where slug='apgi';
 ownerbps=case when (c->>'ownerId')::uuid=q.company_id then 8000 when (c->>'ownerIsApgi')::boolean then 0 else 8000 end;
 sellerbps=case when (c->>'ownerId')::uuid=q.company_id then 0 when (c->>'ownerIsApgi')::boolean then 8000 else 1000 end;
 ownerc=amount*ownerbps/10000;sellerc=amount*sellerbps/10000;
 insert into public.cc_redemptions(seat_id,order_id,currency,edition_id,credit_units,content_cents,owner_id,seller_id,owner_cents,seller_cents,apgi_cents)
 values(s.id,o.id,o.currency,p_edition,units,amount,(c->>'ownerId')::uuid,q.company_id,ownerc,sellerc,amount-ownerc-sellerc) returning * into r;
 insert into public.cc_balance_events(seat_id,kind,units,amount_cents,reference) values(s.id,'redeem',-units,-amount,r.id::text);
 -- Test entitlements remain isolated: no course_enrolments/progress/certificate writes.
 return r;
end;$$;

create function public.cc_hold_payment(p_intent text,p_event text,p_refund boolean) returns void language plpgsql set search_path='' as $$
declare o public.cc_orders;s public.cc_seats;remaining_units bigint;remaining_cents bigint;
begin
 select * into o from public.cc_orders where payment_intent=p_intent for update;
 if not found then return;end if;
 for s in select * from public.cc_seats where order_id=o.id for update loop
  if p_refund and s.state<>'refunded' then
   select coalesce(sum(units),0),coalesce(sum(amount_cents),0) into remaining_units,remaining_cents from public.cc_balance_events where seat_id=s.id;
   insert into public.cc_balance_events(seat_id,kind,units,amount_cents,reference) values(s.id,'refund',-remaining_units,-remaining_cents,p_event) on conflict do nothing;
  elsif not p_refund then
   insert into public.cc_balance_events(seat_id,kind,units,amount_cents,reference) values(s.id,'hold',0,0,p_event) on conflict do nothing;
  end if;
  update public.cc_seats set state=case when p_refund then 'refunded' else 'held' end where id=s.id;
 end loop;
 update public.cc_orders set state=case when p_refund then 'refunded' else 'held' end where id=o.id;
end;$$;

create function public.cc_seat_balances(p_actor uuid,p_company uuid default null)
returns table(seat_id uuid,remaining_units bigint,remaining_cents bigint,courses_used bigint) language sql stable set search_path='' as $$
 select s.id,coalesce((select sum(e.units) from public.cc_balance_events e where e.seat_id=s.id),0)::bigint,
 coalesce((select sum(e.amount_cents) from public.cc_balance_events e where e.seat_id=s.id),0)::bigint,
 (select count(*) from public.cc_redemptions r where r.seat_id=s.id)
 from public.cc_seats s join public.cc_orders o on o.id=s.order_id
 where case when p_company is null then s.learner_id=p_actor else o.company_id=p_company and public.cc_can_manage(p_actor,p_company) end;
$$;

-- Private service-only API. No browser writes, including direct RPC invocation.
do $$declare t text; f record;begin
 foreach t in array array['cc_cost_versions','cc_credit_versions','cc_policy_versions','cc_policy_decisions','cc_policy_activations','cc_quotes','cc_quote_decisions','cc_orders','cc_seats','cc_redemptions','cc_balance_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public, anon, authenticated, service_role',t);
  execute format('grant select,insert on public.%I to service_role',t);
 end loop;
 grant update on public.cc_orders,public.cc_seats to service_role;
 revoke all on sequence public.cc_balance_events_id_seq from public,anon,authenticated;
 grant usage,select on sequence public.cc_balance_events_id_seq to service_role;
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'cc\_%' escape '\' loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end;$$;
