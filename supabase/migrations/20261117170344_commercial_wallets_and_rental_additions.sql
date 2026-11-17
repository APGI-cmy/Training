-- Additive co-terminating course seats and versioned purchasing-credit redemption.
alter table public.cc_seats add column parent_seat_id uuid references public.cc_seats(id);
alter table public.cc_seats add column added_edition_id uuid references public.course_editions(id);
alter table public.cc_seats add constraint cc_addition_pair check((parent_seat_id is null)=(added_edition_id is null));
create unique index cc_added_course_once on public.cc_seats(parent_seat_id,added_edition_id) where parent_seat_id is not null;
alter function public.cc_fund_order(uuid,text,text,text,bigint,text,boolean) rename to cc_fund_order_legacy_20261117;
create function public.cc_fund_order(p_order uuid,p_checkout text,p_intent text,p_event text,p_amount bigint,p_currency text,p_live boolean) returns void language plpgsql set search_path='' as $$
declare o public.cc_orders;q public.cc_quotes;original public.cc_orders;parent public.cc_seats;c jsonb;addition jsonb;ids jsonb;counted integer:=0;places integer;units bigint;amount bigint;created uuid;i integer:=0;
begin
 select * into o from public.cc_orders where id=p_order for update;
 select * into q from public.cc_quotes where id=o.quote_id;
 addition=q.input->'rentalAddition';
 if q.result->>'structureVersion' is distinct from '2026-11-17.3' then perform public.cc_fund_order_legacy_20261117(p_order,p_checkout,p_intent,p_event,p_amount,p_currency,p_live);return;end if;
 if p_live is distinct from false or o.mode<>'test' or o.checkout_id is distinct from p_checkout or o.amount_cents<>p_amount or lower(o.currency)<>lower(p_currency) or q.result->>'structureVersion'<>'2026-11-17.3' then raise exception 'Sandbox addition payment mismatch';end if;
 if o.state='funded' then if o.payment_intent=p_intent then return;else raise exception 'Payment identity mismatch';end if;end if;
 if o.state not in ('pending','checkout') or not coalesce(public.cc_quote_ready(q.id),false) then raise exception 'Approved payable addition required';end if;
 if addition is null then
  places=(q.input->>'seats')::integer;units=(q.result->>'units')::bigint;
  for i in 1..places loop
   if q.input->>'balanceUnit'='purchasing-credits' then amount=(q.result->>'contentCents')::bigint/places;
   else select sum((value->>'commercialRedemptionCents')::bigint+case when i<=coalesce((value->>'commercialRedemptionRemainder')::integer,0) then 1 else 0 end) into amount from jsonb_array_elements(q.courses);end if;
   if amount is null or amount<=0 then raise exception 'Exact new content balance required';end if;
   insert into public.cc_seats(order_id,position,credit_units,course_limit,content_cents,expires_at) values(o.id,i,units,(q.input->>'courseCap')::integer,amount,now()+make_interval(months=>(q.input->>'months')::integer)) returning id into created;
   insert into public.cc_balance_events(seat_id,kind,units,amount_cents,reference) values(created,'fund',units,amount,p_intent);
  end loop;
  if (select sum(content_cents) from public.cc_seats where order_id=o.id)<>(q.result->>'contentCents')::bigint then raise exception 'Per-learner content allocations do not reconcile';end if;
  update public.cc_orders set state='funded',funded_at=now(),payment_intent=p_intent,event_id=p_event where id=o.id;return;
 end if;
 select * into original from public.cc_orders where id=(addition->>'originalOrderId')::uuid;
 if original.state<>'funded' or original.mode<>'test' or original.company_id<>q.company_id then raise exception 'Funded original rental required';end if;
 if not exists(select 1 from public.cc_quotes oq where oq.id=original.quote_id and oq.input->>'route'='subscription' and oq.input->'rentalAddition' is null and oq.result->>'structureVersion'='2026-11-17.3') then raise exception 'Original rental version required';end if;
 ids=addition->'parentSeatIds';places=(q.input->>'seats')::integer;
 if places<1 or jsonb_array_length(ids)<>places or (select count(distinct value) from jsonb_array_elements_text(ids))<>places or jsonb_array_length(q.courses)<>1 then raise exception 'Distinct affected rental learners and one added course required';end if;
 c=q.courses->0;units=round((c->>'hours')::numeric*100000)::bigint;amount=(c->>'commercialRedemptionCents')::bigint;
 if amount<=0 or amount*places<>(q.result->>'contentCents')::bigint then raise exception 'Frozen addition content mismatch';end if;
 for parent in select * from public.cc_seats where id in (select value::uuid from jsonb_array_elements_text(ids)) order by id for update loop
  counted=counted+1;
  if parent.order_id<>original.id or parent.parent_seat_id is not null or parent.learner_id is null or parent.state<>'active' or parent.expires_at<>(addition->>'termEnd')::timestamptz then raise exception 'Assigned original rental seats with the frozen end date required';end if;
  if exists(select 1 from public.cc_quotes oq,jsonb_array_elements(oq.courses) oc where oq.id=original.quote_id and oc->>'editionId'=c->>'editionId') then raise exception 'Course already included in the original rental';end if;
  insert into public.cc_seats(order_id,position,learner_id,assigned_at,credit_units,course_limit,content_cents,expires_at,parent_seat_id,added_edition_id)
  values(o.id,counted,parent.learner_id,now(),units,1,amount,parent.expires_at,parent.id,(c->>'editionId')::uuid) returning id into created;
  insert into public.cc_balance_events(seat_id,kind,units,amount_cents,reference) values(created,'fund',units,amount,p_intent);
 end loop;
 if counted<>places then raise exception 'Affected learner set changed';end if;
 update public.cc_orders set state='funded',funded_at=now(),payment_intent=p_intent,event_id=p_event where id=o.id;
end;$$;
revoke all on function public.cc_fund_order(uuid,text,text,text,bigint,text,boolean),public.cc_fund_order_legacy_20261117(uuid,text,text,text,bigint,text,boolean) from public,anon,authenticated;
grant execute on function public.cc_fund_order(uuid,text,text,text,bigint,text,boolean),public.cc_fund_order_legacy_20261117(uuid,text,text,text,bigint,text,boolean) to service_role;

-- Retain the preceding redemption implementation for every historical version.
alter function public.cc_redeem(uuid,uuid,uuid) rename to cc_redeem_legacy_20261117;
create function public.cc_redeem(p_actor uuid,p_seat uuid,p_edition uuid) returns public.cc_redemptions language plpgsql set search_path='' as $$
declare s public.cc_seats;o public.cc_orders;q public.cc_quotes;c jsonb;r public.cc_redemptions;used bigint;usedc bigint;countc integer;units bigint;amount bigint;ownerbps integer;sellerbps integer;apgibps integer;ownerc bigint;sellerc bigint;
begin
 select * into s from public.cc_seats where id=p_seat for update;
 if not found then raise exception 'Assigned test place required';end if;
 select * into o from public.cc_orders where id=s.order_id;
 select * into q from public.cc_quotes where id=o.quote_id;
 if q.result->>'structureVersion' is distinct from '2026-11-17.3' then return public.cc_redeem_legacy_20261117(p_actor,p_seat,p_edition);end if;
 if s.learner_id is distinct from p_actor or o.state<>'funded' or o.mode<>'test' or s.state<>'active' or s.expires_at<=now() then raise exception 'Active funded assigned test entitlement required';end if;
 if s.parent_seat_id is not null and not exists(select 1 from public.cc_seats ps join public.cc_orders po on po.id=ps.order_id where ps.id=s.parent_seat_id and ps.state='active' and ps.expires_at>now() and po.state='funded' and ps.learner_id=p_actor) then raise exception 'The original rental is held, refunded or expired';end if;
 select * into r from public.cc_redemptions where seat_id=s.id and edition_id=p_edition;
 if found then return r;end if;
 select value into c from jsonb_array_elements(q.courses) where value->>'editionId'=p_edition::text;
 if c is null then raise exception 'Course is outside the frozen purchased catalogue';end if;
 amount=(c->>'commercialRedemptionCents')::bigint+case when s.position<=coalesce((c->>'commercialRedemptionRemainder')::integer,0) then 1 else 0 end;
 if amount is null or amount<=0 or amount<(c->>'minimumCents')::bigint then raise exception 'A funded approved course price covering owner minimum is required';end if;
 units=case when q.input->>'balanceUnit'='purchasing-credits' then amount*10000 else round((c->>'hours')::numeric*100000)::bigint end;
 select coalesce(sum(credit_units),0),coalesce(sum(content_cents),0),count(*) into used,usedc,countc from public.cc_redemptions where seat_id=s.id;
 if units<=0 or used+units>s.credit_units or usedc+amount>s.content_cents or countc>=s.course_limit then raise exception 'Purchasing balance, course allowance or course cap exceeded';end if;
 ownerbps=(c->'negotiatedShares'->>'ownerBps')::integer;sellerbps=(c->'negotiatedShares'->>'sellerBps')::integer;apgibps=(c->'negotiatedShares'->>'apgiBps')::integer;
 if ownerbps is null or sellerbps is null or apgibps is null or least(ownerbps,sellerbps,apgibps)<0 or ownerbps+sellerbps+apgibps<>10000 then raise exception 'Invalid frozen owner/seller/APGI allocation';end if;
 ownerc=amount*ownerbps/10000;sellerc=amount*sellerbps/10000;
 insert into public.cc_redemptions(seat_id,order_id,currency,edition_id,credit_units,content_cents,owner_id,seller_id,owner_cents,seller_cents,apgi_cents)
 values(s.id,o.id,o.currency,p_edition,units,amount,(c->>'ownerId')::uuid,q.company_id,ownerc,sellerc,amount-ownerc-sellerc) returning * into r;
 insert into public.cc_balance_events(seat_id,kind,units,amount_cents,reference) values(s.id,'redeem',-units,-amount,r.id::text);
 -- No live course enrolment, progress, assessment or certificate is created.
 return r;
end;$$;
revoke all on function public.cc_redeem(uuid,uuid,uuid),public.cc_redeem_legacy_20261117(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.cc_redeem(uuid,uuid,uuid),public.cc_redeem_legacy_20261117(uuid,uuid,uuid) to service_role;
