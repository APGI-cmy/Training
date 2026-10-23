-- Run against V2 only. All test records and queued messages are rolled back.
begin;
do $$
declare principal uuid;owner uuid=gen_random_uuid();learner uuid=gen_random_uuid();other_user uuid=gen_random_uuid();
 org uuid=gen_random_uuid();other_org uuid=gen_random_uuid();sid uuid;eid uuid;cid text='vpshr-level-0';
 design jsonb='{"subject":"Hello {{recipient_name}}","heading":"Course update","body":"Thank you for learning with us.","button":"Open course","destination":"course","image":"course"}';
 rule jsonb;counted integer;claimed jsonb;foreign_blocked boolean=false;review_id uuid=gen_random_uuid();review_email uuid;published_email uuid;promotion_email uuid;group_email uuid;fixture_group uuid=gen_random_uuid();owner_email text;learner_email text;before_events integer;invitation_id uuid;first_snapshot jsonb;
begin
 select u.id into principal from auth.users u join public.platform_principals p on lower(p.email)=lower(u.email) where u.email_confirmed_at is not null limit 1;
 if principal is null then raise exception 'A verified V2 principal is required for this test';end if;
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(owner,'email-owner-'||owner||'@example.invalid',now(),'{}'),(learner,'email-learner-'||learner||'@example.invalid',now(),'{}'),(other_user,'email-other-'||other_user||'@example.invalid',now(),'{}');
 insert into public.organisations(id,slug,name) values(org,'email-qa-'||org,'Email QA company'),(other_org,'email-qa-'||other_org,'Unrelated QA company');
 insert into public.organisation_memberships(organisation_id,user_id,membership_role,is_active) values(org,owner,'owner',true);
 insert into public.course_enrolments(user_id,course_id,status,source,organisation_id) values(learner,cid,'enrolled','admin',org);
 sid=public.v2_email_set_save(owner,null,org,1,'QA set','Company policy');
 begin perform public.v2_email_set_save(owner,null,other_org,1,'Forbidden','');exception when others then foreign_blocked=true;end;
 if not foreign_blocked then raise exception 'Cross-company authoring was allowed';end if;
 if jsonb_array_length(public.v2_email_workspace(owner)->'companies')<>1 then raise exception 'Company isolation failed';end if;
 -- Library metadata is scoped even though the actual email graphics are public.
 insert into public.v2_image_library(organisation_id,title,course_id,purpose,object_path,created_by) values(org,'Course artwork',cid,'both',org||'/'||gen_random_uuid()||'.jpg',owner),(other_org,'Other company artwork',cid,'email',other_org||'/'||gen_random_uuid()||'.jpg',other_user);
 if jsonb_array_length(public.v2_image_library_list(owner))<>1 or public.v2_image_library_list(owner)->0->>'title'<>'Course artwork' or jsonb_array_length(public.v2_image_library_list(other_user))<>0 then raise exception 'Image library company isolation failed';end if;
 foreign_blocked=false;begin perform public.v2_image_library_add(owner,other_org,'Forbidden',cid,'email',other_org||'/'||gen_random_uuid()||'.jpg');exception when others then foreign_blocked=true;end;
 if not foreign_blocked then raise exception 'Cross-company image registration was allowed';end if;
 if has_table_privilege('authenticated','public.v2_image_library','select') or has_table_privilege('anon','public.v2_image_library','insert') or has_function_privilege('authenticated','public.v2_image_library_list(uuid)','execute') then raise exception 'Private library metadata was exposed';end if;
 rule=jsonb_build_object('trigger','completion','cadence','once','audience','enrolled','course_id',cid,'group_id','','recipients','[]'::jsonb,'start_at','','end_at','','deadline_at','','days_before',14,'first_time_only',false,'marketing',false,'policy_confirmed',true);
 eid=public.v2_email_entry_save(owner,null,sid,1,'Congratulations',design,rule);
 perform public.v2_email_queue();if exists(select 1 from public.v2_email_outbox where entry_id=eid) then raise exception 'Draft sent unexpectedly';end if;
 perform public.v2_email_entry_state(owner,eid,1,'active');
 insert into public.completion_states(user_id,course_id,status,completed_units,total_units,progress_percent,certificate_eligible,completed_at) values(learner,cid,'completed',8,8,100,true,now());
 perform public.v2_email_queue();
 if (select count(*) from public.v2_email_outbox where entry_id=eid)<>1 then raise exception 'Completion event did not queue exactly once';end if;
 perform public.v2_email_queue();if (select count(*) from public.v2_email_outbox where entry_id=eid)<>1 then raise exception 'Duplicate event delivery';end if;
 -- Marketing requires affirmative consent and a company-scoped recipient.
 rule=jsonb_set(jsonb_set(jsonb_set(rule,'{trigger}','"schedule"'),'{audience}','"members"'),'{marketing}','true');
 eid=public.v2_email_entry_save(owner,null,sid,1,'Announcement',design,rule);
 perform public.v2_email_entry_state(owner,eid,1,'active');perform public.v2_email_queue();
 if exists(select 1 from public.v2_email_outbox where entry_id=eid) then raise exception 'Marketing sent without consent';end if;
 -- Separate scheduled message can be sent after opt-in.
 perform public.v2_email_preference(learner,org,true);
 eid=public.v2_email_entry_save(owner,null,sid,1,'Consented announcement',design,rule);
 perform public.v2_email_entry_state(owner,eid,1,'active');perform public.v2_email_queue();
 if (select count(*) from public.v2_email_outbox where entry_id=eid)<>1 then raise exception 'Opted-in recipient missing';end if;
 perform public.v2_email_preference(learner,org,false);perform public.v2_email_claim();
 if exists(select 1 from public.v2_email_outbox where entry_id=eid and state='sending') then raise exception 'Opt-out was ignored at delivery';end if;
 -- A reminder stops when a learner completes the course, including queued retries.
 delete from public.completion_states where user_id=learner and course_id=cid;
 rule=jsonb_set(jsonb_set(jsonb_set(jsonb_set(rule,'{trigger}','"deadline"'),'{audience}','"enrolled"'),'{marketing}','false'),'{deadline_at}',to_jsonb((now()+interval '2 days')::text));
 eid=public.v2_email_entry_save(owner,null,sid,1,'Deadline reminder',design,rule);
 perform public.v2_email_entry_state(owner,eid,1,'active');perform public.v2_email_queue();
 if (select count(*) from public.v2_email_outbox where entry_id=eid)<>1 then raise exception 'Due reminder missing';end if;
 insert into public.completion_states(user_id,course_id,status,completed_units,total_units,progress_percent,certificate_eligible,completed_at) values(learner,cid,'completed',8,8,100,true,now());
 perform public.v2_email_claim();if exists(select 1 from public.v2_email_outbox where entry_id=eid and state='sending') then raise exception 'Completed learner received a reminder';end if;
 -- Calendar recurrence and optimistic concurrency protect saved decisions.
 rule=jsonb_set(jsonb_set(jsonb_set(rule,'{trigger}','"schedule"'),'{cadence}','"yearly"'),'{end_at}',to_jsonb((now()+interval '3 years')::text));
 eid=public.v2_email_entry_save(owner,null,sid,1,'Annual message',design,rule);perform public.v2_email_entry_state(owner,eid,1,'active');perform public.v2_email_queue();
 if (select extract(year from age(next_at,activated_at)) from public.v2_email_entries where id=eid)<>1 then raise exception 'Annual cadence is wrong';end if;
 foreign_blocked=false;begin perform public.v2_email_entry_save(other_user,eid,sid,1,'Forged',design,rule);exception when others then foreign_blocked=true;end;
 if not foreign_blocked then raise exception 'Non-admin could edit an email';end if;
 foreign_blocked=false;begin perform public.v2_email_entry_save(owner,eid,sid,99,'Stale edit',design,rule);exception when others then foreign_blocked=true;end;
 if not foreign_blocked then raise exception 'Stale edit was accepted';end if;
 -- Real review/document and publication table events, still inside this rollback.
 select email into owner_email from auth.users where id=owner;select email into learner_email from auth.users where id=learner;
 insert into public.course_review_rounds(id,organisation_id,course_id,fingerprint,revision,status,document)
 values(review_id,org,cid,repeat('a',64),1,'open',jsonb_build_object('title','QA course','brand',jsonb_build_object('name','QA company'),'cutoff',now()+interval '1 month','participants',jsonb_build_array(jsonb_build_object('email',owner_email,'state','active','role','primary','tasks',jsonb_build_array('content','commercials','branding')),jsonb_build_object('email',learner_email,'state','active','role','primary','tasks',jsonb_build_array('content'))),'reports','[]'::jsonb,'taskDecisions','[]'::jsonb,'workflow',jsonb_build_object('commercials','[]'::jsonb)));
 rule=rule||jsonb_build_object('trigger','review_complete','cadence','once','audience','reviewers','deadline_at','','end_at','');
 review_email=public.v2_email_entry_save(owner,null,sid,1,'Reviewer thanks',design,rule);perform public.v2_email_entry_state(owner,review_email,1,'active');
 update public.course_review_rounds set document=jsonb_set(document,'{reports}',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'email',learner_email,'at',now()))) where id=review_id;
 perform public.v2_email_queue();if (select count(*) from public.v2_email_outbox where entry_id=review_email)<>1 then raise exception 'Report submission event missing';end if;
 update public.course_review_rounds set document=jsonb_set(document,'{taskDecisions}',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'email',owner_email,'task','branding','decision','approve','at',now()))) where id=review_id;
 update public.course_review_rounds set document=jsonb_set(document,'{workflow,commercials}',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'decisions',jsonb_build_array(jsonb_build_object('email',owner_email,'decision','approve','at',now()))))) where id=review_id;
 perform public.v2_email_queue();if (select count(*) from public.v2_email_outbox where entry_id=review_email)<>3 then raise exception 'Branding or commercial thanks missing';end if;
 select count(*) into before_events from public.v2_email_event_log where organisation_id=org;
 update public.course_review_rounds set document=jsonb_set(document,'{cutoff}',to_jsonb((now()+interval '2 months')::text)) where id=review_id;
 if (select count(*) from public.v2_email_event_log where organisation_id=org)<>before_events then raise exception 'Unrelated review change created historical mail';end if;
 rule=rule||jsonb_build_object('trigger','review_published');published_email=public.v2_email_entry_save(owner,null,sid,1,'Published reviewer thanks',design,rule);perform public.v2_email_entry_state(owner,published_email,1,'active');
 perform public.v2_email_preference(learner,org,true);
 rule=rule||jsonb_build_object('trigger','new_course','audience','members','marketing',true);
 promotion_email=public.v2_email_entry_save(owner,null,sid,1,'New course promotion',design,rule);perform public.v2_email_entry_state(owner,promotion_email,1,'active');
 perform public.v2_email_queue();if exists(select 1 from public.v2_email_outbox where entry_id in(published_email,promotion_email)) then raise exception 'Unpublished course announcement was queued';end if;
 update public.course_review_rounds set status='published' where id=review_id;
 insert into public.organisation_offerings(organisation_id,course_id,status,created_by,reviewed_release_id) values(org,cid,'published',owner,review_id);
 perform public.v2_email_queue();if (select count(*) from public.v2_email_outbox where entry_id=published_email)<>2 then raise exception 'Published reviewer thanks missing';end if;
 if (select count(*) from public.v2_email_outbox where entry_id=promotion_email)<>1 then raise exception 'Consented new-course announcement missing';end if;
 insert into public.learner_groups(id,organisation_id,name,created_by) values(fixture_group,org,'QA enrolled group',owner);
 update public.course_enrolments set group_id=fixture_group where user_id=learner and course_id=cid and organisation_id=org;
 rule=rule||jsonb_build_object('trigger','group_complete','audience','admins','marketing',false,'group_id',fixture_group);
 group_email=public.v2_email_entry_save(owner,null,sid,1,'Group feedback',design,rule);perform public.v2_email_entry_state(owner,group_email,1,'active');perform public.v2_email_queue();
 if not exists(select 1 from public.v2_email_outbox where entry_id=group_email and recipient=owner_email) then raise exception 'Completed group follow-up missing';end if;
 -- Blank course is permitted for drafts; actual event emails still require it.
 rule=rule||jsonb_build_object('trigger','completion','audience','enrolled','course_id','','group_id','');
 eid=public.v2_email_entry_save(owner,null,sid,1,'Unconfigured starter',design,rule);
 foreign_blocked=false;begin perform public.v2_email_entry_state(owner,eid,1,'active');exception when others then foreign_blocked=true;end;
 if not foreign_blocked then raise exception 'An unconfigured event message was activated';end if;
 -- A company-wide invitation design is used only by the real review queue.
 rule=rule||jsonb_build_object('trigger','review_request','audience','reviewers');
 design=jsonb_set(design,'{image}','"library:reviews-01"');
 eid=public.v2_email_entry_save(owner,null,sid,1,'Review request',design,rule);perform public.v2_email_entry_state(owner,eid,1,'active');
 if public.v2_email_review_design(org,cid) is null or public.v2_email_review_design(other_org,cid) is not null then raise exception 'Review template company isolation failed';end if;
 select count(*) into counted from public.v2_email_outbox;perform public.v2_email_queue();
 if exists(select 1 from public.v2_email_outbox where entry_id=eid) then raise exception 'Activating a request template sent arbitrary invitations';end if;
 insert into public.course_review_mail(round_id,notification_key,recipient,kind,subject,body,state) values(review_id,'qa-invitation:'||gen_random_uuid(),learner_email,'invitation','Original','Private joining instructions','sending') returning id into invitation_id;
 first_snapshot=public.v2_email_invitation_snapshot(invitation_id,'{"mode":"native","subject":"Frozen","body":"First version"}');
 if public.v2_email_invitation_snapshot(invitation_id,'{"mode":"native","subject":"Changed","body":"Second version"}')<>first_snapshot then raise exception 'Invitation retry changed its frozen content';end if;
 if has_function_privilege('authenticated','public.v2_email_review_design(uuid,text)','execute') or has_function_privilege('anon','public.v2_email_invitation_snapshot(uuid,jsonb)','execute') then raise exception 'Private invitation functions are publicly executable';end if;
end $$;
select 'PASS: company isolation, draft safety, completion, deduplication, consent, opt-out, deadline stop, yearly cadence, stale edits, report/branding/commercial events, publication announcements and group follow-up' result;
rollback;
