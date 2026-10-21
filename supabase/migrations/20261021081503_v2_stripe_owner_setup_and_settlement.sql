-- V2 sandbox plumbing only. No live credentials, learner entitlements or live payments.
create table public.v2_stripe_private_setup (
 id text primary key check(id='platform'),owner_id uuid not null references auth.users(id),
 sealed text not null,verified_at timestamptz not null default now(),bank_managed_in_stripe boolean not null check(bank_managed_in_stripe)
);
create table public.v2_stripe_setup_requests (
 id uuid primary key default gen_random_uuid(),singleton boolean not null default true unique check(singleton),
 requested_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 mail_state text not null default 'pending' check(mail_state in ('pending','accepted','failed')),
 provider_message_id text,invitation_id uuid references public.course_invitations(id),sealed_token text
);
create table public.v2_stripe_audit (
 id uuid primary key default gen_random_uuid(),actor_id uuid references auth.users(id),action text not null,created_at timestamptz not null default now()
);
create table public.v2_stripe_partner_accounts (
 company_id uuid primary key references public.organisations(id),owner_id uuid not null references auth.users(id),
 country text not null check(country ~ '^[A-Z]{2}$'),account_id text unique,
 state text not null check(state in ('onboarding','ready','alternative_required','restricted')),
 updated_at timestamptz not null default now()
);
create table public.v2_stripe_orders (
 id uuid primary key default gen_random_uuid(),buyer_id uuid not null references auth.users(id),
 release_id uuid not null references public.course_review_rounds(id),company_id uuid not null references public.organisations(id),
 course_id text not null,currency text not null check(currency in ('cad','usd','zar')),
 amount bigint not null check(amount>0 and amount<=1000000000000),snapshot jsonb not null,
 checkout_id text unique,payment_intent text unique,charge_id text unique,
 state text not null default 'created' check(state in ('created','checkout','paid','allocated','transferred','held','reconciliation')),
 hold_reason text,allocation jsonb,created_at timestamptz not null default now()
);
create index stripe_orders_company on public.v2_stripe_orders(company_id,created_at desc);
create table public.v2_stripe_recovery_pools (
 course_id text not null,owner_id uuid not null references public.organisations(id),currency text not null,
 development bigint not null,initial_paid bigint not null,recovered bigint not null default 0,
 primary key(course_id,owner_id,currency),unique(course_id,owner_id),check(initial_paid>=0 and recovered>=0 and initial_paid+recovered<=development)
);
create table public.v2_stripe_allocations (
 order_id uuid not null references public.v2_stripe_orders(id),company_id uuid not null references public.organisations(id),
 amount bigint not null check(amount>0),account_id text,transfer_id text unique,
 state text not null default 'pending' check(state in ('pending','transferred','reconciliation')),
 primary key(order_id,company_id)
);
create table public.v2_stripe_webhook_events (
 id text primary key,body_hash text not null,event_type text not null,state text not null default 'pending' check(state in ('pending','done')),
 created_at timestamptz not null default now()
);

create function public.v2_stripe_owner(p_actor uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select public.v2_is_platform_principal(p_actor) and exists(select 1 from auth.users where id=p_actor and lower(email)='jorrie.jordaan@apginc.ca' and email_confirmed_at is not null);
$$;
create function public.v2_stripe_save_private(p_actor uuid,p_sealed text) returns void language plpgsql security invoker set search_path='' as $$
begin
 if not public.v2_stripe_owner(p_actor) or length(p_sealed)<40 then raise exception 'Jorrie-only private setup';end if;
 insert into public.v2_stripe_private_setup(id,owner_id,sealed,bank_managed_in_stripe) values('platform',p_actor,p_sealed,true)
 on conflict(id) do update set owner_id=excluded.owner_id,sealed=excluded.sealed,verified_at=now(),bank_managed_in_stripe=true;
 insert into public.v2_stripe_audit(actor_id,action) values(p_actor,'sandbox_connection_verified');
end $$;
create function public.v2_stripe_public_status() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('configured',exists(select 1 from public.v2_stripe_private_setup),'verified_at',(select verified_at from public.v2_stripe_private_setup),'requested',exists(select 1 from public.v2_stripe_setup_requests),'mail_state',(select mail_state from public.v2_stripe_setup_requests));
$$;
create function public.v2_stripe_request(p_actor uuid,p_hash text,p_sealed_token text) returns public.v2_stripe_setup_requests language plpgsql security invoker set search_path='' as $$
declare r public.v2_stripe_setup_requests;i uuid;org uuid;u uuid;
begin
 if not public.v2_is_platform_principal(p_actor) then raise exception 'Principal required';end if;
 perform pg_advisory_xact_lock(981342701);
 select * into r from public.v2_stripe_setup_requests where singleton;
 if found then return r;end if;
 select id into u from auth.users where lower(email)='jorrie.jordaan@apginc.ca' and email_confirmed_at is not null;
 if u is null then
  select id into i from public.course_invitations where recipient_email='jorrie.jordaan@apginc.ca' and invited_role='admin' and status in ('pending','sent') and expires_at>now() order by created_at desc limit 1;
  if i is null then
   if p_hash !~ '^[a-f0-9]{64}$' or length(p_sealed_token)<40 then raise exception 'Invitation required';end if;
   select id into org from public.organisations where slug='apgi' and is_active;
   insert into public.course_invitations(recipient_email,invited_role,basis,reason,organisation_id,expires_at,token_hash,created_by,status)
    values('jorrie.jordaan@apginc.ca','admin','internal_allocation','APGI owner: private Stripe sandbox and bank setup',org,now()+interval '30 days',p_hash,p_actor,'pending') returning id into i;
   insert into public.course_invitation_events(invitation_id,event_type,actor_id,metadata) values(i,'created',p_actor,'{"invited_role":"admin","full_access_confirmed":true}');
  else p_sealed_token=null;end if;
 else p_sealed_token=null;end if;
 insert into public.v2_stripe_setup_requests(requested_by,invitation_id,sealed_token) values(p_actor,i,p_sealed_token) returning * into r;
 if u is not null then perform public.v2_notice(u,'stripe-setup:'||r.id,'APGI payment setup: please complete your private Stripe and bank setup.','/admin/payments/stripe/private','action',p_actor,'stripe_setup',r.id);end if;
 insert into public.v2_stripe_audit(actor_id,action) values(p_actor,'owner_setup_requested');
 return r;
end $$;

-- Atomic allocation: serialize all companies sharing the same development recovery pool.
create function public.v2_stripe_allocate(p_order uuid,p_fee bigint,p_charge text,p_intent text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare o public.v2_stripe_orders;s jsonb;pool public.v2_stripe_recovery_pools;costs bigint;administration bigint;contingency bigint;available bigint;recovery bigint;apgi bigint;partner bigint;owner uuid;partner_id uuid;v_allocation jsonb;
begin
 select * into o from public.v2_stripe_orders where id=p_order for update;
 if not found or o.state not in ('paid','held','allocated','transferred') then raise exception 'Confirmed payment required';end if;
 if o.charge_id is distinct from p_charge or o.payment_intent is distinct from p_intent or p_fee<0 or p_fee>o.amount then raise exception 'Confirmed charge mismatch';end if;
 if o.state in ('allocated','transferred') then return o.allocation;end if;
 s=o.snapshot;owner=(s->>'ownerId')::uuid;partner_id=(s->>'partnerId')::uuid;
 insert into public.v2_stripe_recovery_pools(course_id,owner_id,currency,development,initial_paid) values(o.course_id,owner,o.currency,(s->>'development')::bigint,(s->>'initialPaid')::bigint) on conflict do nothing;
 select * into pool from public.v2_stripe_recovery_pools where course_id=o.course_id and owner_id=owner for update;
 if pool.currency<>o.currency or pool.development<>(s->>'development')::bigint or pool.initial_paid<>(s->>'initialPaid')::bigint then raise exception 'Recovery currency or baseline requires reconciliation';end if;
 costs=(s->>'hostingFixedCents')::bigint+ceil(o.amount*(s->>'hostingRateBps')::numeric/10000)::bigint+p_fee;
 administration=ceil(costs*(s->>'administrationBps')::numeric/10000)::bigint;
 contingency=ceil(costs*coalesce((s->>'contingencyBps')::numeric,0)/10000)::bigint;
 available=o.amount-costs-administration-contingency;
 if available<0 then raise exception 'Actual costs exceed approved price';end if;
 recovery=least(pool.development-pool.initial_paid-pool.recovered,floor(available*(s->>'recoveryBps')::numeric/10000)::bigint);
 apgi=floor((available-recovery)*(s->>'apgiShareBps')::numeric/10000)::bigint;partner=available-recovery-apgi;
 if apgi<(s->>'minimumApgiCents')::bigint then raise exception 'Actual costs breach approved APGI minimum';end if;
 v_allocation=jsonb_build_object('price',o.amount,'costs',costs,'processorFee',p_fee,'administration',administration,'contingency',contingency,'recovery',recovery,'apgi',apgi,'partner',partner);
 if recovery>0 and not exists(select 1 from public.organisations where id=owner and slug='apgi') then
  insert into public.v2_stripe_allocations(order_id,company_id,amount) values(o.id,owner,recovery);
 end if;
 if partner>0 and not exists(select 1 from public.organisations where id=partner_id and slug='apgi') then
  insert into public.v2_stripe_allocations(order_id,company_id,amount) values(o.id,partner_id,partner) on conflict(order_id,company_id) do update set amount=public.v2_stripe_allocations.amount+excluded.amount;
 end if;
 update public.v2_stripe_recovery_pools set recovered=recovered+recovery where course_id=o.course_id and owner_id=owner and currency=o.currency;
 update public.v2_stripe_orders set allocation=v_allocation,state='allocated',hold_reason=null where id=o.id;
 return v_allocation;
end $$;

create function public.v2_stripe_prepare_order(p_actor uuid,p_release uuid,p_company uuid,p_amount bigint,p_currency text,p_course text,p_snapshot jsonb) returns public.v2_stripe_orders language plpgsql security invoker set search_path='' as $$
declare r public.course_review_rounds;w jsonb;v jsonb;o public.v2_stripe_orders;
begin
 if not exists(select 1 from auth.users where id=p_actor and email_confirmed_at is not null) or (not public.v2_is_platform_principal(p_actor) and not exists(select 1 from public.organisation_memberships where organisation_id=p_company and user_id=p_actor and membership_role='owner' and is_active)) then raise exception 'Buyer unavailable';end if;
 select * into r from public.course_review_rounds where id=p_release and status='published' for share;
 if not found then raise exception 'Published release required';end if;
 w=r.document->'workflow';v=w#>'{commercials,-1}';
 if w->>'stage'<>'published' or r.course_id<>p_course or p_snapshot->>'commercialId' is distinct from v->>'id' or p_snapshot->>'fingerprint' is distinct from r.fingerprint or lower(v#>>'{configuration,currency}') is distinct from p_currency
 or p_amount is distinct from (case when (w->>'partner')::boolean then (v#>>'{acceptance,price}')::bigint else (v->>'proposedPrice')::bigint end)
 or not exists(select 1 from public.organisation_offerings where organisation_id=p_company and course_id=p_course and reviewed_release_id=p_release and status='published')
 or (select count(*) from public.platform_principals pp join auth.users u on u.id=pp.user_id and u.email_confirmed_at is not null where exists(select 1 from jsonb_array_elements(v->'decisions') d where d->>'email'=pp.email and d->>'userId'=u.id::text and d->>'decision'='approve'))<>2
 then raise exception 'Approved release changed';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text||p_release::text||p_company::text,0));
 select * into o from public.v2_stripe_orders where buyer_id=p_actor and release_id=p_release and company_id=p_company order by created_at desc limit 1;
 if found then
  if o.state not in ('created','checkout') or o.created_at<now()-interval '23 hours' then raise exception 'Existing order requires reconciliation';end if;
  return o;
 end if;
 insert into public.v2_stripe_orders(buyer_id,release_id,company_id,course_id,amount,currency,snapshot) values(p_actor,p_release,p_company,p_course,p_amount,p_currency,p_snapshot) returning * into o;
 return o;
end $$;

-- Extend inbox task evaluation without altering existing review/policy behaviour.
do $outer$
declare def text;
begin
 select pg_get_functiondef('public.v2_notification_pending(public.admin_notifications)'::regprocedure) into def;
 def=replace(def,E'\n return true;\nend',E'\n if n.source_type=''stripe_setup'' then return mailbox=''jorrie.jordaan@apginc.ca'' and principal and not exists(select 1 from public.v2_stripe_private_setup);end if;\n return true;\nend');
 execute def;
 select pg_get_functiondef('public.v2_sync_notification_tasks(uuid)'::regprocedure) into def;
 def=replace(def,E'\nend ',E'\n if mailbox=''jorrie.jordaan@apginc.ca'' and principal then\n  for r in select * from public.v2_stripe_setup_requests loop\n   perform public.v2_notice(p_user,''stripe-setup:''||r.id,''APGI payment setup: please complete your private Stripe and bank setup.'',''/admin/payments/stripe/private'',''action'',r.requested_by,''stripe_setup'',r.id);\n  end loop;\n end if;\nend ');
 execute def;
end $outer$;

-- Private tables and RPCs never accessible to browser anon/authenticated roles.
do $$declare t text;f text;begin
 foreach t in array array['v2_stripe_private_setup','v2_stripe_setup_requests','v2_stripe_audit','v2_stripe_partner_accounts','v2_stripe_orders','v2_stripe_recovery_pools','v2_stripe_allocations','v2_stripe_webhook_events'] loop
  execute 'alter table public.'||t||' enable row level security';
  execute 'revoke all on public.'||t||' from public,anon,authenticated';
  execute 'grant all on public.'||t||' to service_role';
 end loop;
 foreach f in array array['v2_stripe_owner(uuid)','v2_stripe_save_private(uuid,text)','v2_stripe_public_status()','v2_stripe_request(uuid,text,text)','v2_stripe_allocate(uuid,bigint,text,text)','v2_stripe_prepare_order(uuid,uuid,uuid,bigint,text,text,jsonb)'] loop
  execute 'revoke all on function public.'||f||' from public,anon,authenticated';
  execute 'grant execute on function public.'||f||' to service_role';
 end loop;
end $$;
