-- Payment foundation: editable course prices, recipient allocation rules and
-- a private reconciliation ledger. Checkout and transfers are intentionally
-- introduced in a later Stripe-enabled release.

create table if not exists public.course_commerce_settings (
  course_id text primary key,
  price_cents integer not null check (price_cents >= 0),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  tax_treatment text not null default 'not_collected'
    check (tax_treatment in ('not_collected', 'inclusive', 'exclusive')),
  tax_notice text not null default 'Taxes are not collected by APGI for this course. Buyers and recipients remain responsible for their own tax obligations.',
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_payment_recipients (
  id uuid primary key default gen_random_uuid(),
  course_id text not null,
  display_name text not null check (length(trim(display_name)) between 2 and 120),
  recipient_email text,
  country_code char(2),
  revenue_share_bps integer not null default 0 check (revenue_share_bps between 0 and 10000),
  payout_rule text not null default 'per_transaction'
    check (payout_rule in ('per_transaction', 'transaction_threshold', 'monthly')),
  transaction_threshold integer,
  stripe_connected_account_id text unique,
  onboarding_status text not null default 'not_started'
    check (onboarding_status in ('not_started', 'pending', 'complete', 'restricted', 'disabled')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (payout_rule = 'transaction_threshold' and transaction_threshold between 2 and 250)
    or (payout_rule <> 'transaction_threshold' and transaction_threshold is null)
  )
);

create table if not exists public.course_payment_orders (
  id uuid primary key default gen_random_uuid(),
  course_id text not null,
  learner_id uuid references auth.users(id),
  purchaser_email text not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'cancelled', 'refunded', 'disputed', 'unknown')),
  provider text,
  provider_payment_id text unique,
  idempotency_key text not null unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.course_payment_orders(id) on delete restrict,
  provider_event_id text unique,
  previous_status text,
  next_status text not null,
  source text not null check (source in ('provider_webhook', 'admin', 'system')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.course_recipient_allocations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.course_payment_orders(id) on delete restrict,
  recipient_id uuid not null references public.course_payment_recipients(id) on delete restrict,
  amount_cents integer not null check (amount_cents >= 0),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  allocation_status text not null default 'pending'
    check (allocation_status in ('pending', 'eligible', 'transferred', 'reversed', 'held')),
  provider_transfer_id text unique,
  eligible_at timestamptz,
  transferred_at timestamptz,
  created_at timestamptz not null default now(),
  unique (order_id, recipient_id)
);

create table if not exists public.course_recipient_payout_batches (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.course_payment_recipients(id) on delete restrict,
  course_id text not null,
  payout_rule text not null check (payout_rule in ('per_transaction', 'transaction_threshold', 'monthly')),
  amount_cents integer not null check (amount_cents >= 0),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'draft' check (status in ('draft', 'queued', 'paid', 'failed', 'reversed')),
  provider_payout_id text unique,
  scheduled_for timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_orders_course_status on public.course_payment_orders(course_id, payment_status, created_at desc);
create index if not exists idx_payment_events_order on public.course_payment_events(order_id, created_at desc);
create index if not exists idx_allocations_recipient_status on public.course_recipient_allocations(recipient_id, allocation_status, created_at desc);
create index if not exists idx_payout_batches_recipient_status on public.course_recipient_payout_batches(recipient_id, status, created_at desc);

create or replace function public.alp_validate_recipient_share_total()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  remaining integer;
begin
  select coalesce(sum(revenue_share_bps), 0) into remaining
  from public.course_payment_recipients
  where course_id = new.course_id
    and is_active
    and id is distinct from new.id;
  if new.is_active and remaining + new.revenue_share_bps > 10000 then
    raise exception 'Recipient allocations cannot exceed 100 percent for a course.';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_course_payment_recipient_share_total on public.course_payment_recipients;
create trigger validate_course_payment_recipient_share_total
before insert or update of course_id, revenue_share_bps, is_active on public.course_payment_recipients
for each row execute function public.alp_validate_recipient_share_total();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'course_commerce_settings', 'course_payment_recipients', 'course_payment_orders',
    'course_payment_events', 'course_recipient_allocations', 'course_recipient_payout_batches'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all privileges on table public.%I from public, anon, authenticated', table_name);
    execute format('grant all privileges on table public.%I to service_role', table_name);
  end loop;
end;
$$;

alter function public.alp_validate_recipient_share_total() set search_path = '';

drop trigger if exists set_course_commerce_settings_updated_at on public.course_commerce_settings;
create trigger set_course_commerce_settings_updated_at before update on public.course_commerce_settings for each row execute function public.set_updated_at();
drop trigger if exists set_course_payment_recipients_updated_at on public.course_payment_recipients;
create trigger set_course_payment_recipients_updated_at before update on public.course_payment_recipients for each row execute function public.set_updated_at();
drop trigger if exists set_course_payment_orders_updated_at on public.course_payment_orders;
create trigger set_course_payment_orders_updated_at before update on public.course_payment_orders for each row execute function public.set_updated_at();
drop trigger if exists set_course_recipient_payout_batches_updated_at on public.course_recipient_payout_batches;
create trigger set_course_recipient_payout_batches_updated_at before update on public.course_recipient_payout_batches for each row execute function public.set_updated_at();

insert into public.course_commerce_settings (course_id, price_cents, currency)
values
  ('vpshr-level-0', 12000, 'USD'),
  ('scannex-training-programme', 30000, 'USD')
on conflict (course_id) do update set
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  updated_at = now();
