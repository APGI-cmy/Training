alter table public.course_purchase_orders drop constraint course_purchase_orders_state_check;
alter table public.course_purchase_orders add constraint course_purchase_orders_state_check check(state in ('pending','checkout','fulfilled','refunded','reconciliation','expired'));
alter table public.course_purchase_entitlements drop constraint course_purchase_entitlements_user_id_edition_id_kind_mode_key;
create unique index course_purchase_one_active_entitlement on public.course_purchase_entitlements(user_id,edition_id,kind,mode) where state='active';
do $$declare definition text;begin
 definition=pg_get_functiondef('public.v3_prepare_course_purchase(uuid,uuid)'::regprocedure);
 definition=replace(definition,'and kind=f.kind and mode=''test''','and kind=f.kind and mode=''test'' and state=''active''');
 execute definition;
end$$;
