-- V2 only, after the Luna-compatible application is ready. Data seed, no schema change.
-- Immutable prior catalogues and their recorded agreement snapshots are retained.
do $$
declare previous public.service_rate_catalogues%rowtype;
begin
  perform pg_advisory_xact_lock(610161200);
  select * into previous from public.service_rate_catalogues order by created_at desc,version desc limit 1;
  if not found then raise exception 'Existing V2 service rate catalogue required'; end if;
  if previous.rate_values ? 'ai.luna.input' and previous.rate_values ? 'ai.luna.output' then return; end if;
  insert into public.service_rate_catalogues(version,parent_version,checked_on,rate_values,review_note)
  values ('2026-10-16.2',previous.version,'2026-10-16',
    previous.rate_values || '{"ai.luna.input":"0.10","ai.luna.output":"0.50"}'::jsonb,
    'Add GPT-6 Luna standard short-context text API rates researched 16 October 2026: USD 0.10 input and USD 0.50 output per million tokens. Source: https://developers.openai.com/api/docs/models/gpt-6-luna . No cache discounts; premium tiers and other usage require allowances. All earlier provider values retained. Planning catalogue only; no financial distribution is approved.');
end $$;
