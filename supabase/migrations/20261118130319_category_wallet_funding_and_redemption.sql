-- New category wallets have a separate dispatch marker. Historical contracts keep their functions.
alter function public.cc_fund_order(uuid,text,text,text,bigint,text,boolean) rename to cc_fund_order_pre_category_20261118;
create function public.cc_fund_order(p_order uuid,p_checkout text,p_intent text,p_event text,p_amount bigint,p_currency text,p_live boolean) returns void language plpgsql set search_path='' as $$
declare o public.cc_orders;q public.cc_quotes;f jsonb;entry jsonb;c jsonb;created uuid;places integer;i integer:=0;face bigint;cash bigint;totalface bigint:=0;totalcash bigint:=0;minimum bigint;
begin
 select * into o from public.cc_orders where id=p_order for update;select * into q from public.cc_quotes where id=o.quote_id;
 if q.input->'walletPurchase'->>'version' is distinct from 'category-wallet-2026-11-18.1' then perform public.cc_fund_order_pre_category_20261118(p_order,p_checkout,p_intent,p_event,p_amount,p_currency,p_live);return;end if;
 if p_live is distinct from false or o.mode<>'test' or o.checkout_id is distinct from p_checkout or o.amount_cents<>p_amount or lower(o.currency)<>lower(p_currency) then raise exception 'Verified sandbox wallet receipt required';end if;
 if o.state='funded' then if o.payment_intent=p_intent then return;else raise exception 'Wallet payment identity mismatch';end if;end if;
 if o.state not in ('pending','checkout') or not coalesce(public.cc_quote_ready(q.id),false) or q.input->>'route'<>'wallet' or q.input->>'balanceUnit'<>'purchasing-credits' or q.result->>'policyVersion'<>'APGI-COMM-PRICE-001/1.4-draft' or not exists(select 1 from public.cc_policy_versions where id=q.policy_id and version='APGI-COMM-PRICE-001/1.4-draft') then raise exception 'Exact approved category wallet and policy required';end if;
 places=(q.input->>'seats')::integer;f=q.result->'walletFunding';
 if places<1 or places>1000 or jsonb_array_length(f->'seats')<>places or f->>'version'<>'category-wallet-2026-11-18.1' or (q.input->>'months')::integer not between 1 and 60 or jsonb_array_length(q.courses)<1 or jsonb_array_length(q.courses)>100 then raise exception 'Invalid frozen wallet allocation';end if;
 if q.buyer_id is null or not coalesce(public.cc_can_shop(q.buyer_id,q.company_id,'wallet',q.courses),false) or places>1 and not coalesce(public.cc_can_manage(q.buyer_id,q.company_id),false) then raise exception 'Wallet buyer and named-capacity authority required';end if;
 for entry in select value from jsonb_array_elements(f->'seats') loop
  i=i+1;face=(entry->>'faceCents')::bigint;cash=(entry->>'cashCents')::bigint;
  if (entry->>'position')::integer<>i or face<=0 or cash<=0 or cash>face or cash*2<face then raise exception 'Wallet credit/cash allocation outside approved discount limits';end if;
  for c in select value from jsonb_array_elements(q.courses) loop
   minimum=greatest((c->>'minimumCents')::bigint,(q.cost_snapshot->'floors'->>(c->>'scope'))::bigint);
   if coalesce((c->>'walletRedemptionCreditCents')::bigint,0)<=0 or coalesce((c->>'walletMinimumCents')::bigint,0)<minimum or floor((c->>'walletRedemptionCreditCents')::numeric*cash/face)<(c->>'walletMinimumCents')::bigint or not (q.input->'walletPurchase'->'categories' ? (c->>'scope')) then raise exception 'Wallet cash does not protect every eligible course minimum';end if;
  end loop;
  if not exists(select 1 from jsonb_array_elements(q.courses) x where (x->>'walletRedemptionCreditCents')::bigint<=face) then raise exception 'Each learner place must afford an eligible course';end if;
  insert into public.cc_seats(order_id,position,learner_id,assigned_at,credit_units,course_limit,content_cents,expires_at)
  values(o.id,i,case when places=1 then q.buyer_id else null end,case when places=1 then now() else null end,face*10000,jsonb_array_length(q.courses),cash,now()+make_interval(months=>(q.input->>'months')::integer)) returning id into created;
  insert into public.cc_balance_events(seat_id,kind,units,amount_cents,reference) values(created,'fund',face*10000,cash,p_intent);
  totalface=totalface+face;totalcash=totalcash+cash;
 end loop;
 if totalface<>(f->>'faceCents')::bigint or totalface<>(q.input->'walletPurchase'->>'faceCents')::bigint or totalface*10000<>(q.result->>'units')::bigint or totalcash<>(q.result->>'contentCents')::bigint or totalcash<>(f->>'cashCents')::bigint then raise exception 'Wallet funding must reconcile every credit and cent';end if;
 update public.cc_orders set state='funded',funded_at=now(),payment_intent=p_intent,event_id=p_event where id=o.id;
end;$$;
revoke all on function public.cc_fund_order(uuid,text,text,text,bigint,text,boolean),public.cc_fund_order_pre_category_20261118(uuid,text,text,text,bigint,text,boolean) from public,anon,authenticated;
grant execute on function public.cc_fund_order(uuid,text,text,text,bigint,text,boolean),public.cc_fund_order_pre_category_20261118(uuid,text,text,text,bigint,text,boolean) to service_role;

alter function public.cc_redeem(uuid,uuid,uuid) rename to cc_redeem_pre_category_20261118;
create function public.cc_redeem(p_actor uuid,p_seat uuid,p_edition uuid) returns public.cc_redemptions language plpgsql set search_path='' as $$
declare s public.cc_seats;o public.cc_orders;q public.cc_quotes;c jsonb;r public.cc_redemptions;used bigint;usedc bigint;countc integer;units bigint;amount bigint;minimum bigint;ownerbps integer;sellerbps integer;apgibps integer;ownerc bigint;sellerc bigint;
begin
 select * into s from public.cc_seats where id=p_seat;select * into o from public.cc_orders where id=s.order_id;select * into q from public.cc_quotes where id=o.quote_id;
 if q.input->'walletPurchase'->>'version' is distinct from 'category-wallet-2026-11-18.1' then return public.cc_redeem_pre_category_20261118(p_actor,p_seat,p_edition);end if;
 -- Lock the order before its seat, consistently with funding/refund/hold operations.
 select * into o from public.cc_orders where id=o.id for update;select * into s from public.cc_seats where id=p_seat for update;
 if s.learner_id is distinct from p_actor or o.state<>'funded' or o.mode<>'test' or s.state<>'active' or s.expires_at<=now() or s.parent_seat_id is not null then raise exception 'Active funded assigned category wallet required';end if;
 select * into r from public.cc_redemptions where seat_id=s.id and edition_id=p_edition;if found then return r;end if;
 select value into c from jsonb_array_elements(q.courses) where value->>'editionId'=p_edition::text;
 if c is null or not (q.input->'walletPurchase'->'categories' ? (c->>'scope')) then raise exception 'Course is outside the purchased category catalogue';end if;
 units=(c->>'walletRedemptionCreditCents')::bigint*10000;
 select coalesce(sum(credit_units),0),coalesce(sum(content_cents),0),count(*) into used,usedc,countc from public.cc_redemptions where seat_id=s.id;
 if units<=0 or used+units>s.credit_units or countc>=s.course_limit then raise exception 'Insufficient purchasing credits or course allowance';end if;
 if usedc<>floor(used::numeric*s.content_cents/s.credit_units)::bigint then raise exception 'Wallet cash ledger requires reconciliation';end if;
 amount=floor((used+units)::numeric*s.content_cents/s.credit_units)::bigint-floor(used::numeric*s.content_cents/s.credit_units)::bigint;
 minimum=greatest((c->>'minimumCents')::bigint,(c->>'walletMinimumCents')::bigint,(q.cost_snapshot->'floors'->>(c->>'scope'))::bigint);
 if amount<minimum or amount<=0 or usedc+amount>s.content_cents then raise exception 'Actual funded cash must cover the approved course minimum';end if;
 ownerbps=(c->'negotiatedShares'->>'ownerBps')::integer;sellerbps=(c->'negotiatedShares'->>'sellerBps')::integer;apgibps=(c->'negotiatedShares'->>'apgiBps')::integer;
 if ownerbps is null or sellerbps is null or apgibps is null or least(ownerbps,sellerbps,apgibps)<0 or ownerbps+sellerbps+apgibps<>10000 then raise exception 'Invalid frozen recipient shares';end if;
 ownerc=amount*ownerbps/10000;sellerc=amount*sellerbps/10000;
 insert into public.cc_redemptions(seat_id,order_id,currency,edition_id,credit_units,content_cents,owner_id,seller_id,owner_cents,seller_cents,apgi_cents)
 values(s.id,o.id,o.currency,p_edition,units,amount,(c->>'ownerId')::uuid,q.company_id,ownerc,sellerc,amount-ownerc-sellerc) returning * into r;
 insert into public.cc_balance_events(seat_id,kind,units,amount_cents,reference) values(s.id,'redeem',-units,-amount,r.id::text);
 -- Sandbox balance accounting only: no live enrolment, progress or certificate write.
 return r;
end;$$;
revoke all on function public.cc_redeem(uuid,uuid,uuid),public.cc_redeem_pre_category_20261118(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.cc_redeem(uuid,uuid,uuid),public.cc_redeem_pre_category_20261118(uuid,uuid,uuid) to service_role;

alter function public.cc_can_shop(uuid,uuid,text,jsonb) rename to cc_can_shop_pre_category_20261118;
create function public.cc_can_shop(p_actor uuid,p_company uuid,p_route text,p_courses jsonb) returns boolean language sql stable set search_path='' as $$
 select case when p_route='wallet' and jsonb_array_length(p_courses)>0 and not exists(select 1 from jsonb_array_elements(p_courses) c where c->>'categoryWalletVersion' is distinct from 'category-wallet-2026-11-18.1') then
 exists(select 1 from auth.users where id=p_actor and email_confirmed_at is not null) and exists(select 1 from public.organisations where id=p_company and is_active)
 and not exists(select 1 from jsonb_array_elements(p_courses) c where not exists(select 1 from public.organisation_offerings f where f.organisation_id=p_company and f.course_id=c->>'courseId' and f.status='published'))
 and (public.cc_can_manage(p_actor,p_company) or exists(select 1 from public.organisation_memberships where user_id=p_actor and organisation_id=p_company and is_active) or
 (exists(select 1 from public.organisations where id=p_company and slug='apgi') and not exists(select 1 from jsonb_array_elements(p_courses) c where c->>'scope' not in ('public','industry'))))
 else public.cc_can_shop_pre_category_20261118(p_actor,p_company,p_route,p_courses) end;
$$;
revoke all on function public.cc_can_shop(uuid,uuid,text,jsonb),public.cc_can_shop_pre_category_20261118(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.cc_can_shop(uuid,uuid,text,jsonb),public.cc_can_shop_pre_category_20261118(uuid,uuid,text,jsonb) to service_role;

-- A wallet may use category courses different from the primary course of its approved structure.
create or replace function public.cc_quote_current(p_actor uuid,p_quote uuid) returns boolean language sql stable set search_path='' as $$
 select q.buyer_id=p_actor and q.expires_at>now() and coalesce(public.cc_quote_ready(q.id),false) and
 q.structure_id=(select structure_id from public.cc_structure_releases where company_id=q.company_id and course_id=case when q.input->'walletPurchase'->>'version'='category-wallet-2026-11-18.1' then q.input->'walletPurchase'->>'primaryCourseId' else q.courses->0->>'courseId' end order by id desc limit 1)
 and public.cc_can_shop(p_actor,q.company_id,q.input->>'route',q.courses)
 from public.cc_quotes q where q.id=p_quote and q.structure_id is not null;
$$;
revoke all on function public.cc_quote_current(uuid,uuid) from public,anon,authenticated;
grant execute on function public.cc_quote_current(uuid,uuid) to service_role;
