-- Additive V2 pricing structures. No historical price, review, enrolment or approval updates.
create table public.cc_price_structures(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.organisations(id),policy_id uuid not null references public.cc_policy_versions(id),created_by uuid not null references auth.users(id),document jsonb not null,fingerprint text not null,created_at timestamptz not null default now());
create index cc_structures_company_idx on public.cc_price_structures(company_id,created_at desc);
create table public.cc_structure_decisions(structure_id uuid not null references public.cc_price_structures(id),actor_id uuid not null references auth.users(id),decision text not null check(decision in ('approve','reject')),reason text not null check(length(reason)>=5),created_at timestamptz not null default now(),primary key(structure_id,actor_id));
create table public.cc_structure_releases(id bigint generated always as identity primary key,structure_id uuid not null unique references public.cc_price_structures(id),company_id uuid not null references public.organisations(id),created_by uuid not null references auth.users(id),effective_at timestamptz not null default now());
create index cc_structure_release_company_idx on public.cc_structure_releases(company_id,id desc);
alter table public.cc_quotes add column structure_id uuid references public.cc_price_structures(id),add column buyer_id uuid references auth.users(id),add column expires_at timestamptz;
create table public.cc_carts(id uuid primary key default gen_random_uuid(),buyer_id uuid not null references auth.users(id),company_id uuid not null references public.organisations(id),state text not null default 'open' check(state in ('open','locked')),created_at timestamptz not null default now());
create unique index cc_cart_open_idx on public.cc_carts(buyer_id,company_id) where state='open';
create table public.cc_cart_items(cart_id uuid not null references public.cc_carts(id),quote_id uuid not null unique references public.cc_quotes(id),primary key(cart_id,quote_id));
create table public.cc_purchase_batches(id uuid primary key default gen_random_uuid(),cart_id uuid not null unique references public.cc_carts(id),buyer_id uuid not null references auth.users(id),company_id uuid not null references public.organisations(id),mode text not null default 'test' check(mode='test'),state text not null default 'pending' check(state in ('pending','checkout','invoice','funded','held','refunded')),payment_method text not null check(payment_method in ('card','invoice')),amount_cents bigint not null check(amount_cents>0),currency text not null,checkout_id text unique,payment_intent text unique,event_id text unique,fee_evidence jsonb,hold_reason text,created_at timestamptz not null default now());
alter table public.cc_orders add column batch_id uuid references public.cc_purchase_batches(id);
alter table public.cc_orders drop constraint cc_orders_checkout_id_key,drop constraint cc_orders_payment_intent_key;
create unique index cc_legacy_checkout_idx on public.cc_orders(checkout_id) where batch_id is null;
create unique index cc_legacy_intent_idx on public.cc_orders(payment_intent) where batch_id is null;
create index cc_order_batch_idx on public.cc_orders(batch_id);
create index cc_order_intent_idx on public.cc_orders(payment_intent);

create function public.cc_structure_approved(p_id uuid) returns boolean language sql stable set search_path='' as $$
 select (select count(*) from public.platform_principals)=2 and (select count(*) from public.cc_structure_decisions where structure_id=p_id and decision='approve' and public.v2_is_platform_principal(actor_id))=2;
$$;
create function public.cc_publish_structure(p_actor uuid,p_id uuid) returns void language plpgsql set search_path='' as $$
declare s public.cc_price_structures;begin
 select * into s from public.cc_price_structures where id=p_id;
 if not found or not public.v2_is_platform_principal(p_actor) or not public.cc_structure_approved(s.id) or not public.cc_policy_ready(s.policy_id) then raise exception 'Both exact structure approvals and active policy required';end if;
 insert into public.cc_structure_releases(structure_id,company_id,created_by) values(s.id,s.company_id,p_actor) on conflict(structure_id) do nothing;
end;$$;
create function public.cc_structure_decision(p_actor uuid,p_id uuid,p_decision text,p_reason text) returns void language plpgsql set search_path='' as $$
begin
 if not public.v2_is_platform_principal(p_actor) then raise exception 'Verified principal required';end if;
 insert into public.cc_structure_decisions(structure_id,actor_id,decision,reason) values(p_id,p_actor,p_decision,p_reason);
end;$$;
create function public.cc_can_shop(p_actor uuid,p_company uuid,p_route text,p_courses jsonb) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from auth.users where id=p_actor and email_confirmed_at is not null) and exists(select 1 from public.organisations where id=p_company and is_active)
 and (public.cc_can_manage(p_actor,p_company) or
 (p_route='individual' and (exists(select 1 from public.organisation_memberships where user_id=p_actor and organisation_id=p_company and is_active) or
 (exists(select 1 from public.organisations where id=p_company and slug='apgi') and jsonb_array_length(p_courses)>0 and not exists(select 1 from jsonb_array_elements(p_courses) c where c->>'scope' is distinct from 'public')))));
$$;
create or replace function public.cc_quote_ready(p_quote uuid) returns boolean language sql stable set search_path='' as $$
 select public.cc_policy_ready(q.policy_id) and case when q.structure_id is null then
 (select count(*) from public.cc_quote_decisions where quote_id=q.id and decision='approve' and public.v2_is_platform_principal(actor_id))=2 else
 exists(select 1 from public.cc_price_structures s join public.cc_structure_releases r on r.structure_id=s.id where s.id=q.structure_id and s.company_id=q.company_id and s.policy_id=q.policy_id and public.cc_structure_approved(s.id)) end
 from public.cc_quotes q where q.id=p_quote;
$$;
create function public.cc_quote_current(p_actor uuid,p_quote uuid) returns boolean language sql stable set search_path='' as $$
 select q.buyer_id=p_actor and q.expires_at>now() and coalesce(public.cc_quote_ready(q.id),false) and
 q.structure_id=(select structure_id from public.cc_structure_releases where company_id=q.company_id order by id desc limit 1) and public.cc_can_shop(p_actor,q.company_id,q.input->>'route',q.courses)
 from public.cc_quotes q where q.id=p_quote and q.structure_id is not null;
$$;
create function public.cc_cart_add(p_actor uuid,p_quote uuid) returns uuid language plpgsql set search_path='' as $$
declare q public.cc_quotes;c uuid;begin
 select * into q from public.cc_quotes where id=p_quote;
 if not found or not coalesce(public.cc_quote_current(p_actor,p_quote),false) then raise exception 'Current approved own quote required';end if;
 insert into public.cc_carts(buyer_id,company_id) values(p_actor,q.company_id) on conflict(buyer_id,company_id) where state='open' do nothing;
 select id into c from public.cc_carts where buyer_id=p_actor and company_id=q.company_id and state='open' for update;
 if (select count(*) from public.cc_cart_items where cart_id=c)>=20 then raise exception 'Cart limit is 20 quotes';end if;
 insert into public.cc_cart_items(cart_id,quote_id) values(c,q.id) on conflict do nothing;return c;
end;$$;
create function public.cc_cart_remove(p_actor uuid,p_cart uuid,p_quote uuid) returns void language plpgsql set search_path='' as $$
begin
 perform id from public.cc_carts where id=p_cart and buyer_id=p_actor and state='open' for update;
 if not found then raise exception 'Own open cart required';end if;
 delete from public.cc_cart_items where cart_id=p_cart and quote_id=p_quote;
end;$$;
create function public.cc_prepare_batch(p_actor uuid,p_cart uuid) returns public.cc_purchase_batches language plpgsql set search_path='' as $$
declare c public.cc_carts;b public.cc_purchase_batches;q public.cc_quotes;s public.cc_price_structures;total bigint:=0;currency text;method text;begin
 select * into c from public.cc_carts where id=p_cart and buyer_id=p_actor for update;if not found then raise exception 'Own cart required';end if;
 select * into b from public.cc_purchase_batches where cart_id=c.id;if found then return b;end if;
 if c.state<>'open' or not exists(select 1 from public.cc_cart_items where cart_id=c.id) then raise exception 'Nonempty open cart required';end if;
 for q in select v.* from public.cc_quotes v join public.cc_cart_items i on i.quote_id=v.id where i.cart_id=c.id order by v.id loop
  if not coalesce(public.cc_quote_current(p_actor,q.id),false) then raise exception 'Quote expired or structure replaced; refresh your cart';end if;
  select * into s from public.cc_price_structures where id=q.structure_id;
  if currency is not null and (currency<>q.result->>'currency' or method<>s.document->>'paymentMethod') then raise exception 'One currency and payment method per cart';end if;
  currency=q.result->>'currency';method=s.document->>'paymentMethod';total=total+(q.result->>'totalCents')::bigint;
 end loop;
 insert into public.cc_purchase_batches(cart_id,buyer_id,company_id,payment_method,amount_cents,currency,state) values(c.id,p_actor,c.company_id,method,total,currency,case when method='invoice' then 'invoice' else 'pending' end) returning * into b;
 insert into public.cc_orders(quote_id,buyer_id,company_id,amount_cents,currency,batch_id) select v.id,p_actor,c.company_id,(v.result->>'totalCents')::bigint,v.result->>'currency',b.id from public.cc_quotes v join public.cc_cart_items i on i.quote_id=v.id where i.cart_id=c.id;
 update public.cc_carts set state='locked' where id=c.id;return b;
end;$$;
create function public.cc_fund_batch(p_batch uuid,p_checkout text,p_intent text,p_event text,p_amount bigint,p_currency text,p_live boolean) returns void language plpgsql set search_path='' as $$
declare b public.cc_purchase_batches;o public.cc_orders;begin
 select * into b from public.cc_purchase_batches where id=p_batch for update;
 if not found or p_live is distinct from false or b.mode<>'test' or b.payment_method<>'card' or b.checkout_id is distinct from p_checkout or b.amount_cents<>p_amount or lower(b.currency)<>lower(p_currency) then raise exception 'Sandbox batch mismatch';end if;
 if b.state in ('funded','held','refunded') then if b.payment_intent=p_intent then return;else raise exception 'Payment identity mismatch';end if;end if;
 if b.state not in ('pending','checkout') or (select coalesce(sum(amount_cents),0) from public.cc_orders where batch_id=b.id)<>b.amount_cents then raise exception 'Batch is not payable';end if;
 for o in select * from public.cc_orders where batch_id=b.id order by id for update loop
  update public.cc_orders set checkout_id=p_checkout where id=o.id;
  perform public.cc_fund_order(o.id,p_checkout,p_intent,p_event||':'||o.id::text,o.amount_cents,p_currency,false);
  if (select input->>'route' from public.cc_quotes where id=o.quote_id)='individual' then update public.cc_seats set learner_id=b.buyer_id,assigned_at=now() where order_id=o.id;end if;
 end loop;
 update public.cc_purchase_batches set state='funded',payment_intent=p_intent,event_id=p_event where id=b.id;
end;$$;

create or replace function public.cc_hold_payment(p_intent text,p_event text,p_refund boolean) returns void language plpgsql set search_path='' as $$
declare o public.cc_orders;s public.cc_seats;remaining_units bigint;remaining_cents bigint;begin
 perform id from public.cc_purchase_batches where payment_intent=p_intent for update;
 for o in select * from public.cc_orders where payment_intent=p_intent order by id for update loop
  if o.state='refunded' then continue;end if;
  for s in select * from public.cc_seats where order_id=o.id order by id for update loop
   if s.state='refunded' then continue;end if;
   if p_refund then
    select coalesce(sum(units),0),coalesce(sum(amount_cents),0) into remaining_units,remaining_cents from public.cc_balance_events where seat_id=s.id;
    insert into public.cc_balance_events(seat_id,kind,units,amount_cents,reference) values(s.id,'refund',-remaining_units,-remaining_cents,p_event) on conflict do nothing;
   else insert into public.cc_balance_events(seat_id,kind,units,amount_cents,reference) values(s.id,'hold',0,0,p_event) on conflict do nothing;end if;
   update public.cc_seats set state=case when p_refund then 'refunded' else 'held' end where id=s.id;
  end loop;
  update public.cc_orders set state=case when p_refund then 'refunded' else 'held' end where id=o.id;
 end loop;
 update public.cc_purchase_batches set state=case when p_refund then 'refunded' else 'held' end where payment_intent=p_intent and state<>'refunded';
end;$$;

-- Redemptions use the frozen, approved external shares on new structure quotes.
-- The legacy branch and the separate private APGI/SRMS agreement are unchanged.
DO $outer$ declare definition text;begin
 select pg_get_functiondef('public.cc_redeem(uuid,uuid,uuid)'::regprocedure) into definition;
 definition=replace(definition,'ownerc=amount*ownerbps/10000;sellerc=amount*sellerbps/10000;',
 'if q.structure_id is not null then
 ownerbps=(c->''negotiatedShares''->>''ownerBps'')::integer;sellerbps=(c->''negotiatedShares''->>''sellerBps'')::integer;
 if ownerbps is null or sellerbps is null or ownerbps<0 or sellerbps<0 or ownerbps+sellerbps>10000 or ownerbps+sellerbps+(c->''negotiatedShares''->>''apgiBps'')::integer<>10000 then raise exception ''Invalid approved recipient allocation'';end if;
 end if;
 ownerc=amount*ownerbps/10000;sellerc=amount*sellerbps/10000;');
 execute definition;
end;$outer$;

do $$declare t text;f record;begin
 foreach t in array array['cc_price_structures','cc_structure_decisions','cc_structure_releases','cc_carts','cc_cart_items','cc_purchase_batches'] loop
  execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);execute format('grant select,insert on public.%I to service_role',t);
 end loop;
 grant update on public.cc_carts,public.cc_purchase_batches to service_role;
 grant delete on public.cc_cart_items to service_role;
 revoke all on sequence public.cc_structure_releases_id_seq from public,anon,authenticated;
 grant usage,select on sequence public.cc_structure_releases_id_seq to service_role;
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'cc\_%' escape '\' loop execute format('revoke all on function %s from public,anon,authenticated',f.signature);execute format('grant execute on function %s to service_role',f.signature);end loop;
end;$$;
