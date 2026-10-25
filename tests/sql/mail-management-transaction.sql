-- Isolated V2 only. No emails sent and all fixtures rolled back.
begin;
do $$
declare owner uuid=gen_random_uuid();outsider uuid=gen_random_uuid();org uuid=gen_random_uuid();other_org uuid=gen_random_uuid();m uuid;a jsonb;again jsonb;private_mail uuid;principal uuid;blocked boolean=false;workspace jsonb;
begin
 select u.id into principal from auth.users u join public.platform_principals p on lower(p.email)=lower(u.email) where u.email_confirmed_at is not null limit 1;
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(owner,'mail-owner-'||owner||'@example.invalid',now(),'{}'),(outsider,'mail-other-'||outsider||'@example.invalid',now(),'{}');
 insert into public.organisations(id,slug,name) values(org,'mail-qa-'||org,'Mail QA company'),(other_org,'mail-qa-'||other_org,'Other mail QA company');
 insert into public.organisation_memberships(organisation_id,user_id,membership_role,is_active) values(org,owner,'owner',true);
 a=public.v2_mail_begin('qa:'||owner,'attempt:'||owner,org,'support',null,'recipient@example.invalid','Scoped test',owner,'<p>Test</p>','Test');
 again=public.v2_mail_begin('qa:'||owner,'attempt:'||owner,org,'support',null,'recipient@example.invalid','Scoped test',owner,'<p>Test</p>','Test');
 if a->>'id'<>again->>'id' then raise exception 'Idempotency failed';end if;
 select message_id into m from public.v2_mail_attempts where id=(a->>'id')::uuid;
 perform public.v2_mail_begin('qa-other:'||owner,'attempt-other:'||owner,other_org,'support',null,'other@example.invalid','Other company',outsider,'<p>Other</p>','Other');
 workspace=public.v2_mail_workspace(owner,'','','',0,null);
 if (workspace->>'total')::integer<>1 then raise exception 'Company isolation failed';end if;
 if (public.v2_mail_workspace(outsider,'','','',0,null)->>'total')::integer<>0 then raise exception 'Ordinary users can see management emails';end if;
 begin perform public.v2_mail_detail(outsider,m);exception when others then blocked=true;end;
 if not blocked then raise exception 'IDOR exposed email details';end if;
 update public.v2_mail_attempts set state='accepted',provider_id='qa-provider-'||owner,created_at=now()-interval '2 minutes' where id=(a->>'id')::uuid;
 insert into public.v2_mail_events(event_key,provider_id,kind,occurred_at) values('qa-open-'||owner,'qa-provider-'||owner,'opened',now());
 insert into public.v2_mail_events(event_key,provider_id,kind,occurred_at) values('qa-delivered-'||owner,'qa-provider-'||owner,'delivered',now()-interval '1 minute');
 insert into public.v2_mail_events(event_key,provider_id,kind,occurred_at) values('qa-open-'||owner,'qa-provider-'||owner,'opened',now()) on conflict do nothing;
 workspace=public.v2_mail_workspace(owner,'','','',0,null);
 if workspace->'messages'->0->>'provider_event'<>'opened' or workspace->'messages'->0->>'accepted_at' is not null then raise exception 'Open was downgraded or treated as invitation acceptance';end if;
 if (select count(*) from public.v2_mail_events where provider_id='qa-provider-'||owner)<>2 then raise exception 'Event deduplication failed';end if;
 perform public.v2_mail_manage(owner,m,'followup','Waiting for confirmation','waiting',now()+interval '1 day');
 if public.v2_mail_workspace(owner,'','','waiting',0,null)->'messages'->0->>'followup_note'<>'Waiting for confirmation' then raise exception 'Followup not saved';end if;
 perform public.v2_mail_manage(owner,m,'resend');blocked=false;
 begin perform public.v2_mail_manage(owner,m,'resend');exception when others then blocked=true;end;
 if not blocked then raise exception 'Concurrent resend not blocked';end if;
 a=public.v2_mail_begin('qa-auth:'||owner,'auth-attempt:'||owner,null,'account_recovery',null,'recipient@example.invalid','Reset',null,'SECRET-LINK','SECRET-LINK');
 if exists(select 1 from public.v2_mail_attempts where id=(a->>'id')::uuid and (html is not null or body like '%SECRET-LINK%')) then raise exception 'Private auth link was retained';end if;
 if public.v2_mail_access(owner,null,'account_recovery') then raise exception 'Company owner can inspect platform account emails';end if;
 if has_table_privilege('authenticated','public.v2_mail_messages','select') or has_table_privilege('anon','public.v2_mail_attempts','select') or has_function_privilege('authenticated','public.v2_mail_workspace(uuid,text,text,text,integer,uuid)','execute') then raise exception 'Direct client access was granted';end if;
 if not exists(select 1 from pg_class where oid='public.v2_mail_attempts'::regclass and relrowsecurity) then raise exception 'RLS missing';end if;
end $$;
rollback;
