-- Producer verification only. No email is sent; every fixture is rolled back.
begin;
do $$
declare actor uuid; org uuid; invite uuid:=gen_random_uuid(); ledger uuid; n integer; data jsonb; denied boolean;
begin
 select user_id into actor from public.platform_principals where lower(email)='johan.ras@apginc.ca';
 select id into org from public.organisations where slug='nks-capital';
 insert into public.course_invitations(id,organisation_id,recipient_email,course_id,basis,reason,expires_at,token_hash,created_by,status,invited_role)
 values(invite,org,'rollback-mail-visibility@example.invalid','tiger-kidnapping-telecommunications','corporate_order','Rollback only fixture',now()+interval '7 days','PRIVATE-FIXTURE-HASH',actor,'pending','learner');
 insert into public.course_invitation_events(invitation_id,event_type,actor_id,metadata) values(invite,'created',actor,'{}');
 insert into public.course_invitation_events(invitation_id,event_type,actor_id,metadata) values(invite,'sent',actor,'{"provider_message_id":"rollback-provider-reference"}');
 select id into ledger from public.v2_mail_messages where message_key='invitation:'||invite;
 if ledger is null then raise exception 'New learner invitation was not indexed';end if;
 select count(*) into n from public.v2_mail_attempts where message_id=ledger;
 perform public.v7_index_invitation(invite);perform public.v7_index_invitation(invite);
 if (select count(*) from public.v2_mail_attempts where message_id=ledger)<>n then raise exception 'Duplicate historical attempt';end if;
 data=public.v2_mail_detail(actor,ledger);
 if data::text like '%PRIVATE-FIXTURE-HASH%' or data::text not like '%rollback-provider-reference%' then raise exception 'Private link or provider reference failure';end if;
 data=public.v7_pending_learner_workspace(actor,'rollback-mail-visibility',0,org);
 if (data->>'total')::integer<>1 then raise exception 'Pending learner not visible';end if;
 if jsonb_array_length(public.v7_pending_learner_workspace(actor,'rollback-mail-visibility',25,org)->'learners')<>0 then raise exception 'Pagination not honoured';end if;
 update public.course_invitations set expires_at=now()-interval '1 day' where id=invite;
 if (public.v7_pending_learner_workspace(actor,'rollback-mail-visibility',0,org)->>'total')::integer<>0 then raise exception 'Expired invitation counted as awaiting registration';end if;
 update public.course_invitations set expires_at=now()+interval '7 days',status='redeemed',redeemed_at=now() where id=invite;
 if (public.v7_pending_learner_workspace(actor,'rollback-mail-visibility',0,org)->>'total')::integer<>0 then raise exception 'Redeemed invitation still pending';end if;
 denied=false;begin perform public.v2_mail_detail(gen_random_uuid(),ledger);exception when others then denied=true;end;
 if not denied then raise exception 'Unauthorised history access';end if;
 denied=false;begin perform public.v7_pending_learner_workspace(gen_random_uuid(),'',0,null);exception when others then denied=true;end;
 if not denied then raise exception 'Unauthorised pending learner access';end if;
 data=public.v2_mail_workspace(actor,'rollback-mail-visibility','learner_invitation','',0,org);
 if (data->>'total')::integer<>1 then raise exception 'Learner category/search not visible';end if;
end $$;
rollback;
select 'Passed: metadata-only history, future event indexing, idempotent backfill, provider references, pending/expired/redeemed states, search, pagination and unauthorised access; all fixtures rolled back, no sends' result;
