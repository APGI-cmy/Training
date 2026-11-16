-- Run with the migration in a transaction and roll back; no course is approved.
do $qa$
declare a uuid;b uuid;doc jsonb;changed jsonb;f1 jsonb;f2 jsonb;hash text=repeat('a',64);next_hash text=repeat('b',64);
begin
 select id into a from auth.users where lower(email)='johan.ras@apginc.ca' and email_confirmed_at is not null;
 select id into b from auth.users where lower(email)='jorrie.jordaan@apginc.ca' and email_confirmed_at is not null;
 if a is null or b is null then raise exception 'Verified QA identities missing';end if;
 f1=jsonb_build_object('id','one','unit','lu1','author','johan.ras@apginc.ca','userId',a,'at','date','outcome','satisfied','status','closed','fingerprint',hash);
 f2=jsonb_build_object('id','two','unit','lu1','author','jorrie.jordaan@apginc.ca','userId',b,'at','date','outcome','satisfied','status','closed','fingerprint',hash);
 doc=jsonb_build_object('reviewProcessVersion',3,'requester','johan.ras@apginc.ca','requesterId',a,'units',jsonb_build_array(jsonb_build_object('slug','lu1')),'findings',jsonb_build_array(f1,f2),'participants',jsonb_build_array(
 jsonb_build_object('email','johan.ras@apginc.ca','userId',a,'role','primary','state','active','coverage',jsonb_build_array('lu1'),'tasks',jsonb_build_array('content')),
 jsonb_build_object('email','jorrie.jordaan@apginc.ca','userId',b,'role','primary','state','active','coverage',jsonb_build_array('lu1'),'tasks',jsonb_build_array('content'))));
 if not public.v3_lu_review_ready(doc,hash) then raise exception 'Unanimous clean review rejected';end if;
 changed=jsonb_set(doc,'{participants,1,coverage}','[]');if public.v3_lu_review_ready(changed,hash) then raise exception 'Missing coverage waived';end if;
 changed=jsonb_set(doc,'{findings}',jsonb_build_array(f1));if public.v3_lu_review_ready(changed,hash) then raise exception 'Missing declaration waived';end if;
 changed=jsonb_set(doc,'{participants,1,userId}',to_jsonb(a::text));if public.v3_lu_review_ready(changed,hash) then raise exception 'Same account waived';end if;
 changed=jsonb_set(doc,'{participants,1,state}','"declined"');if public.v3_lu_review_ready(changed,hash) then raise exception 'Decline waived';end if;
 changed=jsonb_set(doc,'{findings,0,outcome}','"issue"');if public.v3_lu_review_ready(changed,hash) then raise exception 'Issue waived';end if;
 changed=jsonb_set(doc,'{findings,0,workflowEndorsements}',jsonb_build_array(jsonb_build_object('decision','no')));if public.v3_lu_review_ready(changed,hash) then raise exception 'Rejected declaration waived';end if;
 changed=jsonb_set(doc,'{findings,0,previousVersions}',jsonb_build_array(jsonb_build_object('outcome','issue')));if public.v3_lu_review_ready(changed,hash) then raise exception 'Earlier issue erased';end if;
 changed=jsonb_set(doc,'{contentRevisions}',jsonb_build_array(jsonb_build_object('previousFingerprint',hash,'fingerprint',next_hash,'changedUnits',jsonb_build_array('lu2'),'preservedUnits',jsonb_build_array('lu1'))));
 if not public.v3_lu_review_ready(changed,next_hash) then raise exception 'Unchanged clean declarations lost';end if;
 changed=jsonb_set(changed,'{contentRevisions,0,changedUnits}',jsonb_build_array('lu1'));if public.v3_lu_review_ready(changed,next_hash) then raise exception 'Changed LU waived';end if;
 changed=jsonb_set(doc,'{contentRevisions}',jsonb_build_array(jsonb_build_object('previousFingerprint',hash,'fingerprint',next_hash,'changedUnits',jsonb_build_array('lu2'),'preservedUnits',jsonb_build_array('lu1'))));
 changed=jsonb_set(changed,'{findings,0,previousVersions}',jsonb_build_array(jsonb_build_object('outcome','issue')));
 changed=jsonb_set(changed,'{findings,0,workflowEndorsements}',jsonb_build_array(jsonb_build_object('email','jorrie.jordaan@apginc.ca','userId',b,'decision','yes','findingAt','date','fingerprint',hash)));
 changed=jsonb_set(changed,'{findings,1,workflowEndorsements}',jsonb_build_array(jsonb_build_object('email','johan.ras@apginc.ca','userId',a,'decision','yes','findingAt','date','fingerprint',hash)));
 if not public.v3_lu_review_ready(changed,next_hash) then raise exception 'Unchanged actual endorsements lost';end if;
end $qa$;
select '11 clean-review database checks passed; no stored review changed' as result;
