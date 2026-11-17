-- A delayed receipt can already be refunded or disputed. Commit its historical
-- funding and blocked state together, so no active allowance is visible between them.
create function public.cc_confirm_batch(p_batch uuid,p_checkout text,p_intent text,p_event text,p_amount bigint,p_currency text,p_live boolean,p_hold boolean,p_refund boolean) returns void language plpgsql set search_path='' as $$
begin
 if p_hold is null or p_refund is null or (p_refund and not p_hold) then raise exception 'Verified payment status required';end if;
 perform public.cc_fund_batch(p_batch,p_checkout,p_intent,p_event,p_amount,p_currency,p_live);
 if p_hold then perform public.cc_hold_payment(p_intent,p_event,p_refund);end if;
end;$$;
revoke all on function public.cc_confirm_batch(uuid,text,text,text,bigint,text,boolean,boolean,boolean) from public,anon,authenticated;
grant execute on function public.cc_confirm_batch(uuid,text,text,text,bigint,text,boolean,boolean,boolean) to service_role;
