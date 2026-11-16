-- Test settlement cannot become a live entitlement by supplying different
-- parameters. Live acceptance requires a separately reviewed release.
do $$declare definition text;begin
 definition=pg_get_functiondef('public.v3_fulfil_course_purchase(uuid,text,text,text,integer,text,boolean)'::regprocedure);
 if position('select * into o from public.course_purchase_orders' in definition)=0 then raise exception 'UNEXPECTED_PURCHASE_DEFINITION';end if;
 definition=replace(definition,'select * into o from public.course_purchase_orders',
 'if p_live is distinct from false then raise exception ''LIVE_PURCHASE_ACCEPTANCE_PENDING'';end if;
 if p_event is null or p_checkout is null or p_intent is null or p_amount is null or p_currency is null then raise exception ''PAYMENT_CONFIRMATION_REQUIRED'';end if;
 select * into o from public.course_purchase_orders');
 execute definition;
end$$;
create function public.v3_purchase_order_binding() returns trigger language plpgsql set search_path='' as $$begin
 if (to_jsonb(old)-'state'-'checkout_id'-'payment_intent'-'verified_event_id'-'paid_at') is distinct from (to_jsonb(new)-'state'-'checkout_id'-'payment_intent'-'verified_event_id'-'paid_at')
 or old.checkout_id is not null and new.checkout_id is distinct from old.checkout_id
 or old.payment_intent is not null and new.payment_intent is distinct from old.payment_intent
 or old.verified_event_id is not null and new.verified_event_id is distinct from old.verified_event_id then raise exception 'PURCHASE_ORDER_BINDING_IMMUTABLE';end if;
 return new;
end$$;
create trigger purchase_order_binding before update on public.course_purchase_orders for each row execute function public.v3_purchase_order_binding();
revoke all on function public.v3_purchase_order_binding() from public,anon,authenticated;
grant execute on function public.v3_purchase_order_binding() to service_role;
