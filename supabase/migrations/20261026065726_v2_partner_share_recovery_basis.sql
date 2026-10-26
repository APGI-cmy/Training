-- New partner schedules retain APGI's ongoing share and recover development
-- solely from the partner share. Earlier snapshots keep their recorded basis.
create or replace function public.v2_commercial_pool_allocation(
  p_available numeric, p_apgi_percent numeric, p_recovery_percent numeric,
  p_outstanding numeric, p_basis text default 'cost_cleared_pool'
) returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare apgi numeric; recovery numeric; partner numeric;
begin
  if p_available is null or p_available<0 or p_available<>trunc(p_available)
    or p_outstanding is null or p_outstanding<0 or p_outstanding<>trunc(p_outstanding)
    or p_apgi_percent is null or p_apgi_percent<0 or p_apgi_percent>100
    or p_recovery_percent is null or p_recovery_percent<0 or p_recovery_percent>100 then
    raise exception 'Invalid commercial allocation inputs';
  end if;
  if p_basis='partner_share' then
    apgi=floor(p_available*p_apgi_percent/100);
    partner=p_available-apgi;
    recovery=least(p_outstanding,floor(partner*p_recovery_percent/100));
    partner=partner-recovery;
  elsif p_basis='cost_cleared_pool' then
    recovery=least(p_outstanding,floor(p_available*p_recovery_percent/100));
    apgi=floor((p_available-recovery)*p_apgi_percent/100);
    partner=p_available-recovery-apgi;
  else
    raise exception 'Unknown development recovery basis';
  end if;
  return jsonb_build_object('apgi',apgi,'recovery',recovery,'partner',partner);
end $$;
revoke all on function public.v2_commercial_pool_allocation(numeric,numeric,numeric,numeric,text) from public,anon,authenticated;
grant execute on function public.v2_commercial_pool_allocation(numeric,numeric,numeric,numeric,text) to service_role;

-- Preserve all current review, identity, approval, brand and publication gates.
-- Guard replacement anchors so an unexpected installed version cannot be patched.
do $patch$
declare definition text; old_block text; new_block text;
begin
  select replace(pg_get_functiondef('public.v2_publish_reviewed_course(uuid,integer,uuid,text)'::regprocedure),E'\r\n',E'\n') into definition;
  old_block=$old$ recovery=case when v#>>'{configuration,development_status}'='recover' then least(greatest(0,round(((v#>>'{configuration,development_cost}')::numeric-(v#>>'{configuration,already_paid}')::numeric)*100)),floor(available*(v#>>'{configuration,recovery_rate}')::numeric/100)) else 0 end;
 apgi=floor((available-recovery)*(v#>>'{configuration,apgi_share}')::numeric/100);$old$;
  new_block=$new$ select (shares.a->>'recovery')::numeric,(shares.a->>'apgi')::numeric into recovery,apgi
 from (select public.v2_commercial_pool_allocation(available,(v#>>'{configuration,apgi_share}')::numeric,
   case when v#>>'{configuration,development_status}'='recover' then (v#>>'{configuration,recovery_rate}')::numeric else 0 end,
   greatest(0,round(((v#>>'{configuration,development_cost}')::numeric-(v#>>'{configuration,already_paid}')::numeric)*100)),
   coalesce(nullif(v#>>'{configuration,recovery_base}',''),'cost_cleared_pool')) a) shares;$new$;
  if strpos(definition,old_block)=0 then raise exception 'Publication waterfall version changed; inspect before migration';end if;
  execute replace(definition,old_block,new_block);

  select replace(pg_get_functiondef('public.v2_stripe_allocate(uuid,bigint,text,text)'::regprocedure),E'\r\n',E'\n') into definition;
  old_block=$old$ recovery=least(pool.development-pool.initial_paid-pool.recovered,floor(available*(s->>'recoveryBps')::numeric/10000)::bigint);$old$;
  new_block=$new$ select (shares.a->>'recovery')::bigint,(shares.a->>'apgi')::bigint,(shares.a->>'partner')::bigint into recovery,apgi,partner
 from (select public.v2_commercial_pool_allocation(available,(s->>'apgiShareBps')::numeric/100,
   (s->>'recoveryBps')::numeric/100,greatest(0,pool.development-pool.initial_paid-pool.recovered),
   coalesce(nullif(s->>'recoveryBase',''),'cost_cleared_pool')) a) shares;$new$;
  if strpos(definition,old_block)=0 then raise exception 'Settlement waterfall version changed; inspect before migration';end if;
  definition=replace(definition,old_block,new_block);
  old_block=$old$ apgi=floor((available-recovery)*(s->>'apgiShareBps')::numeric/10000)::bigint;partner=available-recovery-apgi;$old$;
  if strpos(definition,old_block)=0 then raise exception 'Settlement split version changed; inspect before migration';end if;
  execute replace(definition,old_block,'');
end $patch$;
