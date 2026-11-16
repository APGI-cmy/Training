alter table public.v2_stripe_webhook_events
 add column if not exists semantic_hash text,
 add column if not exists last_body_hash text,
 add column if not exists last_error text,
 add column if not exists last_attempt_at timestamptz,
 add column if not exists completed_at timestamptz;
-- Original body_hash and all historical failed receipts remain untouched.
-- No grant or policy changes: this is a service-role-only table with RLS enabled.
