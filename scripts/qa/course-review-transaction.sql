-- Execute only against isolated V2. Every fixture and temporary publication rolls back.
begin;
do $$
declare actor uuid; actor_email text; org uuid; brand_rev integer; plan uuid:=gen_random_uuid(); rid uuid:=gen_random_uuid(); d jsonb; p jsonb; blocked boolean; other_id uuid:=gen_random_uuid(); qa_org uuid:=gen_random_uuid();
begin
 select user_id,email into actor,actor_email from public.platform_principals where user_id is not null and public.v2_is_platform_principal(user_id) limit 1;
 if actor is null then raise exception 'No verified principal fixture available';end if;
 select id,brand_revision into org,brand_rev from public.organisations where slug='apgi';
 insert into public.commercial_agreement_drafts(id,organisation_id,course_id,title,kind,configuration,created_by)
 values(plan,org,'vpshr-level-0','QA rollback-only review plan','course_agreement','{"designer_name":"QA fixture","designer_company":"QA fixture"}',actor);
 d=jsonb_build_object('title','QA rollback-only course','brand',jsonb_build_object('name','APGI','revision',brand_rev),'requester',actor_email,'requesterId',actor,'cutoff',now()+interval '7 days','units',jsonb_build_array(jsonb_build_object('slug','lu1','title','Unit 1')),'participants',jsonb_build_array(jsonb_build_object('email',actor_email,'role','primary','state','active','userId',actor,'coverage',jsonb_build_array('lu1')),jsonb_build_object('email','second@qa.invalid','role','primary','state','active','userId',other_id,'coverage',jsonb_build_array('lu1'))),'reports','[]'::jsonb,'findings','[]'::jsonb,'events','[]'::jsonb,'terms',jsonb_build_object('partner',false));
 p=jsonb_build_object('id',rid,'plan_id',plan,'organisation_id',org,'course_id','vpshr-level-0','fingerprint',repeat('a',64),'document',d);
 perform public.v2_create_course_review(p,actor,'[]','[]');
 blocked=false;begin perform public.v2_create_course_review(p,actor,'[]','[]');exception when others then blocked=true;end;if not blocked then raise exception 'Duplicate review request was accepted';end if;
 blocked=false;begin perform public.v2_publish_reviewed_course(rid,1,actor,repeat('a',64));exception when others then blocked=true;end;if not blocked then raise exception 'Unsubmitted review was published';end if;
 d=jsonb_set(d,'{participants,0,state}','"finished"');d=jsonb_set(d,'{participants,1,state}','"finished"');
 d=jsonb_set(d,'{reports}',jsonb_build_array(jsonb_build_object('id','r1','email',actor_email,'userId',actor,'coverage',jsonb_build_array('lu1'),'endorsements',jsonb_build_array(jsonb_build_object('email','second@qa.invalid','userId',other_id,'decision','approve'))),jsonb_build_object('id','r2','email','second@qa.invalid','userId',other_id,'coverage',jsonb_build_array('lu1'),'endorsements',jsonb_build_array(jsonb_build_object('email',actor_email,'userId',actor,'decision','approve')))));
 perform public.v2_commit_course_review(rid,1,d,actor,'qa_commit','[]');
 blocked=false;begin perform public.v2_commit_course_review(rid,1,d,actor,'stale_write','[]');exception when others then blocked=true;end;if not blocked then raise exception 'Stale write overwrote a review';end if;
 blocked=false;begin perform public.v2_publish_reviewed_course(rid,2,actor,repeat('b',64));exception when others then blocked=true;end;if not blocked then raise exception 'Wrong version published';end if;
 d=jsonb_set(d,'{findings}','[{"blocking":true,"status":"open"}]');perform public.v2_commit_course_review(rid,2,d,actor,'qa_blocking_finding','[]');
 blocked=false;begin perform public.v2_publish_reviewed_course(rid,3,actor,repeat('a',64));exception when others then blocked=true;end;if not blocked then raise exception 'Unresolved blocking finding published';end if;
 d=jsonb_set(d,'{findings}','[]');perform public.v2_commit_course_review(rid,3,d,actor,'qa_resolved','[]');
 perform public.v2_publish_reviewed_course(rid,4,actor,repeat('a',64));
 if not exists(select 1 from public.organisation_offerings where organisation_id=org and course_id='vpshr-level-0' and reviewed_release_id=rid and status='published') then raise exception 'Approved release was not published atomically';end if;
 insert into public.organisations(id,name,slug) values(qa_org,'QA rollback-only company','qa-'||qa_org);
 blocked=false;begin insert into public.organisation_offerings(organisation_id,course_id,status,created_by) values(qa_org,'vpshr-level-0','published',actor);exception when others then blocked=true;end;if not blocked then raise exception 'Direct publication bypass succeeded';end if;
end $$;
select 'PASS: duplicate requests, incomplete review, stale writes, changed fingerprint, unresolved defects and direct bypass blocked; approved publication atomic. All fixtures rolled back.' as verification;
rollback;
