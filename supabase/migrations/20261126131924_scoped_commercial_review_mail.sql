-- Dispatch only the already-requested messages for an active commercial pricing
-- batch, without enabling the shared staging scheduler on partner production.
create or replace function public.v8_review_mail_claim_batch(p_batch uuid,p_company uuid)
returns setof public.v6_review_mail language sql set search_path='' as $$
 with chosen as (
  select m.id from public.v6_review_mail m
  join public.v6_review_requests r on r.id::text=m.context->>'requestId'
  where r.batch_id=p_batch and r.organisation_id=p_company and m.organisation_id=p_company
  and r.kind='commercials' and r.snapshot ? 'pricing' and r.superseded_by is null
  and (m.context->>'state'<>'open' or (r.state='open' and r.deadline>now()))
  and ((m.state in('pending','failed') and m.next_at<=now())
    or (m.state='sending' and m.claimed_at<now()-interval '10 minutes'))
  order by m.created_at,m.id limit 10 for update of m skip locked
 )
 update public.v6_review_mail m set state='sending',claim_token=gen_random_uuid(),claimed_at=now()
 from chosen c where m.id=c.id returning m.*;
$$;
revoke all on function public.v8_review_mail_claim_batch(uuid,uuid) from public,anon,authenticated;
grant execute on function public.v8_review_mail_claim_batch(uuid,uuid) to service_role;
