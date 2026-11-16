alter table public.v2_stripe_orders add column if not exists fee_evidence jsonb;

create or replace function public.v3_stripe_reconcile_fee(p_order uuid,p_evidence jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $function$
declare o public.v2_stripe_orders;rate numeric;fee bigint;gross bigint;difference numeric;result jsonb;
begin
 select * into o from public.v2_stripe_orders where id=p_order for update;
 if not found or o.state not in ('paid','held','allocated','transferred') then raise exception 'Confirmed payment required';end if;
 if p_evidence->>'version'<>'1' or p_evidence->>'presentmentCurrency' is distinct from o.currency
  or (p_evidence->>'presentmentAmount')::bigint<>o.amount or p_evidence->>'paymentIntent' is distinct from o.payment_intent
  or p_evidence->>'balanceTransactionId'!~'^txn_[A-Za-z0-9]+$' or p_evidence->>'chargeId'!~'^ch_[A-Za-z0-9]+$'
  or p_evidence->>'settlementCurrency' not in ('usd','cad','zar') or o.currency not in ('usd','cad','zar')
  or p_evidence->>'rounding'<>'up_to_minor_unit' or p_evidence->>'exchangeRate'!~'^[0-9]+([.][0-9]{1,15})?$'
  or exists(select 1 from unnest(array['version','presentmentCurrency','presentmentAmount','paymentIntent','balanceTransactionId','chargeId','settlementCurrency','settlementAmount','settlementFee','settlementNet','exchangeRate','processorFee','rounding']) k where p_evidence->>k is null)
 then raise exception 'Confirmed fee evidence mismatch';end if;
 rate=(p_evidence->>'exchangeRate')::numeric;gross=(p_evidence->>'settlementAmount')::bigint;fee=(p_evidence->>'settlementFee')::bigint;
 if rate<=0 or gross<=0 or fee<0 or fee>gross or gross-fee<>(p_evidence->>'settlementNet')::bigint then raise exception 'Stripe fee totals do not reconcile';end if;
 difference=abs(round(o.amount*rate)-gross);
 if difference>1 or (o.currency=p_evidence->>'settlementCurrency' and (rate<>1 or gross<>o.amount)) then raise exception 'Stripe exchange evidence does not reconcile';end if;
 fee=ceil(fee/rate)::bigint;
 if fee<>(p_evidence->>'processorFee')::bigint or fee>o.amount then raise exception 'Converted processor fee mismatch';end if;
 if o.charge_id is not null and o.charge_id is distinct from p_evidence->>'chargeId' then raise exception 'Order charge changed';end if;
 if o.fee_evidence is not null and o.fee_evidence is distinct from p_evidence then raise exception 'Previously reconciled fee evidence changed';end if;
 if o.state in ('allocated','transferred') and (o.allocation->>'processorFee')::bigint is distinct from fee then raise exception 'Previously allocated fee changed';end if;
 update public.v2_stripe_orders set charge_id=p_evidence->>'chargeId',fee_evidence=p_evidence where id=o.id;
 result=public.v2_stripe_allocate(o.id,fee,p_evidence->>'chargeId',o.payment_intent);
 return result;
end $function$;
revoke all on function public.v3_stripe_reconcile_fee(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.v3_stripe_reconcile_fee(uuid,jsonb) to service_role;
