-- V2 integration check. The entire fixture and its history are rolled back.
begin;
do $$
declare source public.course_review_rounds; fixture public.course_review_rounds;
 actor uuid; next_revision integer; conflict_rejected boolean=false;
begin
 select * into strict source from public.course_review_rounds where id='f1ef8430-64d6-410d-abdf-18a1c0260ded';
 actor=(source.document->>'requesterId')::uuid;
 insert into public.course_review_rounds(id,organisation_id,course_id,fingerprint,status,document)
 values('3ba71a6f-38ca-4634-a170-7d7ecf221d3e',source.organisation_id,source.course_id,source.fingerprint,'open',
 source.document||jsonb_build_object('title','QA only: slide sharing transaction','findings','[]'::jsonb,'reports','[]'::jsonb,'events','[]'::jsonb)) returning * into fixture;
 fixture.document=jsonb_set(fixture.document,'{findings}',jsonb_build_array(jsonb_build_object(
 'id','shared-test','unit','lu1','scope','course','reference','All slides — all learning units',
 'author',source.document->>'requester','userId',actor,'at',now(),'text','QA only: caption all clips',
 'category','Accessibility','blocking',true,'status','open','replies','[]'::jsonb)));
 next_revision=public.v2_commit_course_review(fixture.id,fixture.revision,fixture.document,actor,'finding','[]'::jsonb);
 if next_revision<>fixture.revision+1 then raise exception 'Revision not advanced';end if;
 if not exists(select 1 from public.course_review_rounds r where r.id=fixture.id
 and jsonb_array_length(r.document->'findings')=1 and r.document#>>'{findings,0,scope}'='course'
 and r.document#>>'{findings,0,reference}'='All slides — all learning units') then raise exception 'Shared location not retained';end if;
 if not exists(select 1 from public.course_review_history where round_id=fixture.id and action='finding') then raise exception 'History missing';end if;
 begin
  perform public.v2_commit_course_review(fixture.id,fixture.revision,fixture.document,actor,'finding','[]'::jsonb);
 exception when others then
  if sqlerrm like '%REVIEW_CONFLICT%' then conflict_rejected=true;else raise;end if;
 end;
 if not conflict_rejected then raise exception 'Stale write accepted';end if;
 if exists(select 1 from public.course_review_mail where round_id=fixture.id) then raise exception 'Test queued mail';end if;
end $$;
rollback;
select not exists(select 1 from public.course_review_rounds where id='3ba71a6f-38ca-4634-a170-7d7ecf221d3e') as fixture_rolled_back;
