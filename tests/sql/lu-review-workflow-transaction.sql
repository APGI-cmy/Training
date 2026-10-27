-- Every fixture and DDL change in this QA run is rolled back by the caller.
do $qa$
declare a uuid; b uuid; doc jsonb; f1 jsonb; f2 jsonb; p jsonb; response jsonb; hash text=repeat('a',64); changed jsonb;
begin
 select id into a from auth.users where lower(email)='johan.ras@apginc.ca' and email_confirmed_at is not null;
 select id into b from auth.users where lower(email)='jorrie.jordaan@apginc.ca' and email_confirmed_at is not null;
 if a is null or b is null then raise exception 'Verified QA actors unavailable';end if;
 p=jsonb_build_array(jsonb_build_object('email','johan.ras@apginc.ca','userId',a,'role','primary','state','active','coverage',jsonb_build_array('lu1'),'tasks',jsonb_build_array('content')),jsonb_build_object('email','jorrie.jordaan@apginc.ca','userId',b,'role','primary','state','active','coverage',jsonb_build_array('lu1'),'tasks',jsonb_build_array('content')));
 f1=jsonb_build_object('id','one','unit','lu1','author','johan.ras@apginc.ca','userId',a,'at','finding-date','outcome','issue','status','closed','fixedBy',a,'fixedFingerprint',hash,'verifiedBy',b,'verifiedFingerprint',hash,'implementationRounds',jsonb_build_array(jsonb_build_object('id','r1','number',1,'findingAt','finding-date','fingerprint',hash,'email','johan.ras@apginc.ca','userId',a,'implemented','yes','notes','Corrected the complete clip','endorsements',jsonb_build_array(jsonb_build_object('email','jorrie.jordaan@apginc.ca','userId',b,'decision','yes','reason','','findingAt','finding-date','fingerprint',hash)))));
 f2=jsonb_build_object('id','two','unit','lu1','author','jorrie.jordaan@apginc.ca','userId',b,'at','finding-date','outcome','issue','status','closed','fixedBy',a,'fixedFingerprint',hash,'verifiedBy',b,'verifiedFingerprint',hash,'implementationRounds',jsonb_build_array(jsonb_build_object('id','r2','number',1,'findingAt','finding-date','fingerprint',hash,'email','johan.ras@apginc.ca','userId',a,'implemented','yes','notes','Corrected the full explanation','decision',jsonb_build_object('email','jorrie.jordaan@apginc.ca','userId',b,'decision','accept'),'endorsements',jsonb_build_array(jsonb_build_object('email','johan.ras@apginc.ca','userId',a,'decision','yes','reason','','findingAt','finding-date','fingerprint',hash)))));
 doc=jsonb_build_object('reviewProcessVersion',3,'requester','johan.ras@apginc.ca','requesterId',a,'participants',p,'units',jsonb_build_array(jsonb_build_object('slug','lu1','title','QA unit')),'findings',jsonb_build_array(f1,f2));
 if not public.v3_lu_review_ready(doc,hash) then raise exception 'Valid two-person LU workflow rejected';end if;
 changed=jsonb_set(doc,'{findings,0,implementationRounds,0,endorsements}','[]');if public.v3_lu_review_ready(changed,hash) then raise exception 'Missing peer endorsement accepted';end if;
 changed=jsonb_set(doc,'{findings,0,implementationRounds,0,endorsements,0,userId}',to_jsonb(a::text));if public.v3_lu_review_ready(changed,hash) then raise exception 'Self endorsement accepted';end if;
 changed=jsonb_set(doc,'{findings,1,implementationRounds,0,decision,decision}','"reopen"');if public.v3_lu_review_ready(changed,hash) then raise exception 'Rejected response accepted';end if;
 changed=doc#-'{findings,1,implementationRounds,0,decision}';if public.v3_lu_review_ready(changed,hash) then raise exception 'Missing author acceptance accepted';end if;
 changed=jsonb_set(doc,'{findings,1,implementationRounds,0,fingerprint}','"other"');if public.v3_lu_review_ready(changed,hash) then raise exception 'Stale response accepted';end if;
 changed=jsonb_set(doc,'{participants,1,coverage}','[]');if public.v3_lu_review_ready(changed,hash) then raise exception 'Missing coverage accepted';end if;
 changed=jsonb_set(doc,'{findings,1,implementationRounds,0,implemented}','"no"');if not public.v3_lu_review_ready(changed,hash) then raise exception 'Accepted explanation rejected';end if;
 changed=doc#-'{findings,1,implementationRounds,0,implemented}';if public.v3_lu_review_ready(changed,hash) then raise exception 'Missing implementation decision accepted';end if;
 changed=jsonb_set(doc,'{findings,1,implementationRounds,0,findingAt}','"older"');if public.v3_lu_review_ready(changed,hash) then raise exception 'Earlier finding version accepted';end if;
end $qa$;
select '10 per-LU publication guard checks passed; no stored review changed' as result;
