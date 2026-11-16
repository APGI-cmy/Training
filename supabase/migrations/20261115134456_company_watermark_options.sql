alter table public.organisations add column watermarks jsonb not null default '{}'::jsonb;
alter table public.organisations add constraint organisation_watermarks_object check(jsonb_typeof(watermarks)='object' and pg_column_size(watermarks)<4096);
comment on column public.organisations.watermarks is 'Optional company platform and certificate watermarks; none unless explicitly saved. Certificate settings are copied into new issuance snapshots.';
