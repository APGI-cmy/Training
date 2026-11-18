-- Isolated producer verification. Every fixture and mock function is rolled back.
-- No real approval, charge, email, enrolment or learner result is created.
begin;
create or replace function public.cc_quote_ready(p_quote uuid) returns boolean language sql stable set search_path='' as $$ select true; $$;
do $$
declare actor uuid;company uuid;policy uuid;qid uuid;oid uuid;sid uuid;smallqid uuid;smalloid uuid;smallsid uuid;badqid uuid;badoid uuid;c1 uuid;c2 uuid;other uuid;rid uuid;again uuid;denied boolean;courses jsonb;input jsonb;result jsonb;
begin
 select user_id into actor from public.platform_principals where lower(email)='johan.ras@apginc.ca';select id into company from public.organisations where slug='apgi';
 select id into c1 from public.course_editions where course_id='vpshr-level-0' and state='ready' order by edition_number desc limit 1;
 select id into c2 from public.course_editions where course_id='scannex-training-programme' and state='ready' order by edition_number desc limit 1;
 select id into other from public.course_editions where course_id='executive-assistant-lu1-compatibility' and state='ready' order by edition_number desc limit 1;
 if actor is null or company is null or c1 is null or c2 is null or other is null then raise exception 'Required verified staging fixtures unavailable';end if;
 insert into public.cc_policy_versions(version,body,body_hash,created_by) values('APGI-COMM-PRICE-001/1.4-draft','ROLLBACK ONLY category wallet fixture','rollback-only',actor) on conflict(version) do nothing;
 select id into policy from public.cc_policy_versions where version='APGI-COMM-PRICE-001/1.4-draft';
 courses=jsonb_build_array(jsonb_build_object('editionId',c1,'courseId','vpshr-level-0','scope','public','ownerId',company,'minimumCents',500,'walletMinimumCents',500,'walletRedemptionCreditCents',10000,'categoryWalletVersion','category-wallet-2026-11-18.1','negotiatedShares',jsonb_build_object('ownerBps',8000,'sellerBps',0,'apgiBps',2000)),jsonb_build_object('editionId',c2,'courseId','scannex-training-programme','scope','industry','ownerId',company,'minimumCents',500,'walletMinimumCents',500,'walletRedemptionCreditCents',10000,'categoryWalletVersion','category-wallet-2026-11-18.1','negotiatedShares',jsonb_build_object('ownerBps',8000,'sellerBps',0,'apgiBps',2000)));
 input=jsonb_build_object('mode','credits','route','wallet','seats',1,'months',3,'courseCap',2,'balanceUnit','purchasing-credits','walletPurchase',jsonb_build_object('version','category-wallet-2026-11-18.1','faceCents',1000000,'categories',jsonb_build_array('public','industry'),'primaryCourseId','vpshr-level-0'));
 result=jsonb_build_object('currency','USD','totalCents',1000000,'contentCents',950000,'units',10000000000,'structureVersion','2026-11-17.3','policyVersion','APGI-COMM-PRICE-001/1.4-draft','walletFunding',jsonb_build_object('version','category-wallet-2026-11-18.1','faceCents',1000000,'cashCents',950000,'seats',jsonb_build_array(jsonb_build_object('position',1,'faceCents',1000000,'cashCents',950000))));
 insert into public.cc_quotes(company_id,created_by,buyer_id,input,result,courses,cost_snapshot,fingerprint,policy_id) values(company,actor,actor,input,result,courses,'{"floors":{"public":500,"industry":500}}','rollback-q',policy) returning id into qid;
 insert into public.cc_orders(quote_id,buyer_id,company_id,mode,state,checkout_id,amount_cents,currency) values(qid,actor,company,'test','checkout','cs_rollback_category_wallet',1000000,'USD') returning id into oid;
 denied=false;begin perform public.cc_fund_order(oid,'cs_rollback_category_wallet','pi_rollback_category_wallet','evt_rollback_category_wallet',1000000,'USD',true);exception when others then denied=true;end;if not denied then raise exception 'Live payment was accepted';end if;
 perform public.cc_fund_order(oid,'cs_rollback_category_wallet','pi_rollback_category_wallet','evt_rollback_category_wallet',1000000,'USD',false);
 perform public.cc_fund_order(oid,'cs_rollback_category_wallet','pi_rollback_category_wallet','evt_rollback_category_wallet',1000000,'USD',false);
 if (select count(*) from public.cc_seats where order_id=oid)<>1 then raise exception 'Receipt retry duplicated wallet funding';end if;
 select id into sid from public.cc_seats where order_id=oid;
 if not exists(select 1 from public.cc_seats where id=sid and learner_id=actor and credit_units=10000000000 and content_cents=950000) then raise exception 'Face credits and actual cash were not separated';end if;
 denied=false;begin perform public.cc_redeem(gen_random_uuid(),sid,c1);exception when others then denied=true;end;if not denied then raise exception 'Another actor redeemed the wallet';end if;
 denied=false;begin perform public.cc_redeem(actor,sid,other);exception when others then denied=true;end;if not denied then raise exception 'A course outside the frozen categories was redeemed';end if;
 select id into rid from public.cc_redeem(actor,sid,c1);select id into again from public.cc_redeem(actor,sid,c1);if rid<>again then raise exception 'Duplicate redemption was not idempotent';end if;
 if not exists(select 1 from public.cc_redemptions where id=rid and credit_units=100000000 and content_cents=9500 and owner_cents+seller_cents+apgi_cents=9500) then raise exception 'Redemption did not allocate actual discounted cash';end if;
 perform public.cc_redeem(actor,sid,c2);
 if (select sum(content_cents) from public.cc_redemptions where seat_id=sid)<>19000 then raise exception 'Two redemption cash amounts do not reconcile';end if;
 if (select sum(units) from public.cc_balance_events where seat_id=sid)<>9800000000 or (select sum(amount_cents) from public.cc_balance_events where seat_id=sid)<>931000 then raise exception 'Remaining credits/cash ledger mismatch';end if;
 -- A second funded wallet can afford exactly one of the two eligible courses.
 input=jsonb_set(input,'{walletPurchase,faceCents}','10000');result=jsonb_set(jsonb_set(jsonb_set(result,'{totalCents}','10000'),'{contentCents}','10000'),'{units}','100000000');result=jsonb_set(result,'{walletFunding}','{"version":"category-wallet-2026-11-18.1","faceCents":10000,"cashCents":10000,"seats":[{"position":1,"faceCents":10000,"cashCents":10000}]}');
 insert into public.cc_quotes(company_id,created_by,buyer_id,input,result,courses,cost_snapshot,fingerprint,policy_id) values(company,actor,actor,input,result,courses,'{"floors":{"public":500,"industry":500}}','rollback-small-q',policy) returning id into smallqid;
 insert into public.cc_orders(quote_id,buyer_id,company_id,mode,state,checkout_id,amount_cents,currency) values(smallqid,actor,company,'test','checkout','cs_rollback_small_wallet',10000,'USD') returning id into smalloid;
 perform public.cc_fund_order(smalloid,'cs_rollback_small_wallet','pi_rollback_small_wallet','evt_rollback_small_wallet',10000,'USD',false);
 select id into smallsid from public.cc_seats where order_id=smalloid;perform public.cc_redeem(actor,smallsid,c1);
 denied=false;begin perform public.cc_redeem(actor,smallsid,c2);exception when others then denied=true;end;if not denied then raise exception 'Wallet overspend was allowed';end if;
 update public.cc_orders set state='held' where id=oid;
 denied=false;begin perform public.cc_redeem(actor,sid,c1);exception when others then denied=true;end;if not denied then raise exception 'Held payment allowed redemption';end if;
end;$$;
rollback;
select 'passed: verified sandbox funding, receipt retry, personal assignment, independent credit/cash balances, actual-cash allocations, duplicate redemption, actor/category checks, overspend and held-payment rejection; all fixtures rolled back' as category_wallet_transaction_checks;
