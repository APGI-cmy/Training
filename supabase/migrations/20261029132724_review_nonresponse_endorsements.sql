-- Content-only nonresponse requests. No public table or RPC access.
alter table public.course_review_mail add column sent_at timestamptz;
create table public.course_review_response_requests(
 id uuid primary key default gen_random_uuid(),round_id uuid not null references public.course_review_rounds(id),
 request_key text not null,kind text not null check(kind in ('initial','endorsement')),recipient text not null,
 fingerprint text not null,units jsonb not null,finding_id text,finding_at text,response_id text,
 notice_key text not null,requested_at timestamptz not null,created_at timestamptz not null default now(),notified_at timestamptz,due_at timestamptz,
 state text not null default 'pending' check(state in ('pending','answered','cancelled','deemed')),deemed_at timestamptz,
 unique(round_id,request_key),foreign key(notice_key) references public.course_review_mail(notification_key)
);
create index course_review_response_due on public.course_review_response_requests(due_at) where state='pending';
create index course_review_response_notice on public.course_review_response_requests(notice_key);
alter table public.course_review_response_requests enable row level security;
revoke all on public.course_review_response_requests from anon,authenticated;
grant all on public.course_review_response_requests to service_role;

create function public.v3_review_mail_sent_clock() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.state='sent' and old.state is distinct from 'sent' then new.sent_at=coalesce(new.sent_at,clock_timestamp());end if;
 return new;
end $$;
create trigger v3_review_mail_sent_clock before update on public.course_review_mail for each row execute function public.v3_review_mail_sent_clock();
create function public.v3_review_request_delivery_clock() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.state='sent' and new.sent_at is not null then update public.course_review_response_requests set notified_at=new.sent_at,due_at=new.sent_at+interval '7 days' where notice_key=new.notification_key and recipient=new.recipient and notified_at is null and state='pending';end if;
 return new;
end $$;
create trigger v3_review_request_delivery_clock after update on public.course_review_mail for each row execute function public.v3_review_request_delivery_clock();

create function public.v3_deemed_record_valid(d jsonb,fp text,e jsonb,unit_slug text) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare q public.course_review_response_requests;
begin
 if d#>>'{nonresponsePolicy,version}' is distinct from '1' or d#>>'{nonresponsePolicy,days}' is distinct from '7' then return false;end if;
 select * into q from public.course_review_response_requests where id::text=e->>'requestId' and round_id::text=d#>>'{nonresponsePolicy,roundId}' and state='deemed';
 return coalesce(q.id is not null and q.recipient=e->>'recipient' and q.kind=e->>'kind' and q.fingerprint=e->>'fingerprint'
  and q.notified_at>=(d#>>'{nonresponsePolicy,enabledAt}')::timestamptz and q.notified_at>=q.requested_at and q.due_at>=q.notified_at+interval '7 days' and q.deemed_at>=q.due_at and q.deemed_at=(e->>'at')::timestamptz
  and q.notified_at=(e->>'notifiedAt')::timestamptz and q.due_at=(e->>'dueAt')::timestamptz and e->'units' ? unit_slug
  and q.units ? unit_slug and exists(select 1 from public.course_review_mail m where m.notification_key=q.notice_key and m.recipient=q.recipient and m.state='sent' and m.sent_at=q.notified_at)
  and exists(select 1 from jsonb_array_elements(d->'participants') p where p->>'email'=q.recipient and p->>'state'<>'declined' and public.v2_review_task_assigned(p,'content'))
  and public.v3_review_evidence_current(d,jsonb_build_object('unit',unit_slug),q.fingerprint,fp),false);
end $$;

create function public.v3_nonresponse_response(d jsonb,fp text,f jsonb) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare r jsonb=f->'implementationRounds'->-1;
begin
 if r is not null then return r;end if;
 if f->>'fixedFingerprint'=fp and f->>'fixedBy' is not null and f->>'fixedAt' is not null then
  return jsonb_build_object('id','legacy-'||(f->>'id'),'findingAt',f->>'at','fingerprint',fp,'email',coalesce(d->>'designerEmail',d->>'requester'),'userId',f->>'fixedBy','at',f->>'fixedAt','implemented','yes','notes','Earlier implementation retained');
 end if;return null;
end $$;

create function public.v3_finding_deemed(d jsonb,fp text,f jsonb,p_recipient text default null) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare e jsonb;q public.course_review_response_requests;r jsonb=public.v3_nonresponse_response(d,fp,f);writer text;unit jsonb;valid_scope boolean;
begin
 if f#>>'{declarationReopen,findingAt}'=f->>'at' and public.v3_review_evidence_current(d,f,f#>>'{declarationReopen,fingerprint}',fp) then return false;end if;
 if r#>>'{decision,decision}'='reopen' or r ? 'endorsementReopen' then return false;end if;
 writer=case when f->>'outcome'='satisfied' then f->>'author' else r->>'email' end;
 for e in select a from jsonb_array_elements(coalesce(d->'deemedEndorsements','[]')) a where p_recipient is null or a->>'recipient'=p_recipient loop
  if writer is null or e->>'recipient'=writer then continue;end if;
  if exists(select 1 from jsonb_array_elements(d->'participants') p where p->>'email'=e->>'recipient' and p->>'userId'=case when f->>'outcome'='satisfied' then f->>'userId' else r->>'userId' end) then continue;end if;
  valid_scope=true;
  for unit in select u from jsonb_array_elements(d->'units') u where f->>'scope'='course' or u->>'slug'=f->>'unit' loop
   if not public.v3_deemed_record_valid(d,fp,e,unit->>'slug') then valid_scope=false;exit;end if;
  end loop;
  if not valid_scope or not exists(select 1 from jsonb_array_elements(d->'units') u where u->>'slug'=f->>'unit') then continue;end if;
  select * into q from public.course_review_response_requests where id::text=e->>'requestId';
  if q.kind='initial' and f->>'outcome'='satisfied' and (f->>'at')::timestamptz<=q.deemed_at then return true;end if;
  if q.kind='endorsement' and q.finding_id=f->>'id' and q.finding_at=f->>'at' and coalesce(q.response_id,'')=coalesce(r->>'id','') then return true;end if;
 end loop;return false;
end $$;

create function public.v3_person_deemed(d jsonb,fp text,email_address text,unit_slug text) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare e jsonb;f jsonb;
begin
 for e in select a from jsonb_array_elements(coalesce(d->'deemedEndorsements','[]')) a where a->>'recipient'=email_address loop
  if not public.v3_deemed_record_valid(d,fp,e,unit_slug) then continue;end if;
  if e->>'kind'='initial' then return true;end if;
  select a into f from jsonb_array_elements(d->'findings') a where not(a ? 'supersededBy') and a->>'id'=e->>'findingId';
  if f is not null and (f->>'unit'=unit_slug or f->>'scope'='course') and public.v3_finding_deemed(d,fp,f,email_address) then return true;end if;
 end loop;return false;
end $$;

create function public.v3_initial_review_responded(d jsonb,email_address text) returns boolean language sql stable security invoker set search_path='' as $$
 select not exists(select 1 from jsonb_array_elements(d->'participants') p where p->>'email'=email_address and p->>'state'<>'declined')
 or exists(select 1 from jsonb_array_elements(d->'participants') p where p->>'email'=email_address and jsonb_array_length(coalesce(p->'coverage','[]'))>0)
 or exists(select 1 from jsonb_array_elements(coalesce(d->'findings','[]')) f where f->>'author'=email_address or exists(select 1 from jsonb_array_elements(coalesce(f->'replies','[]')) r where r->>'email'=email_address))
 or exists(select 1 from jsonb_array_elements(coalesce(d->'requests','[]')) r where r->>'requestedBy'=email_address);
$$;

create function public.v3_response_request_pending(q public.course_review_response_requests) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare r public.course_review_rounds;d jsonb;p jsonb;f jsonb;response jsonb;decisions jsonb;endorsement jsonb;writer text;
begin
 select * into r from public.course_review_rounds where id=q.round_id;d=r.document;
 if r.status is distinct from 'open' or r.fingerprint<>q.fingerprint or d#>>'{nonresponsePolicy,version}' is distinct from '1' or d#>>'{nonresponsePolicy,days}' is distinct from '7' or d#>>'{nonresponsePolicy,roundId}' is distinct from r.id::text then return false;end if;
 select a into p from jsonb_array_elements(d->'participants') a where a->>'email'=q.recipient and a->>'state'<>'declined' and public.v2_review_task_assigned(a,'content');if p is null then return false;end if;
 if q.kind='initial' then return p->>'role'='primary' and jsonb_array_length(q.units)=jsonb_array_length(d->'units') and not exists(select 1 from jsonb_array_elements(d->'units') u where not(q.units ? (u->>'slug'))) and q.requested_at>=greatest((d#>>'{nonresponsePolicy,enabledAt}')::timestamptz,coalesce((d#>>'{contentRevisions,-1,at}')::timestamptz,(d#>>'{nonresponsePolicy,enabledAt}')::timestamptz)) and not public.v3_initial_review_responded(d,q.recipient) and exists(select 1 from jsonb_array_elements(d->'units') u where not public.v3_person_deemed(d,r.fingerprint,q.recipient,u->>'slug'));end if;
 select a into f from jsonb_array_elements(d->'findings') a where not(a ? 'supersededBy') and a->>'id'=q.finding_id and a->>'at'=q.finding_at;
 if f is null or public.v3_finding_deemed(d,r.fingerprint,f) or not exists(select 1 from auth.users u where u.id::text=f->>'userId' and lower(u.email)=f->>'author' and u.email_confirmed_at is not null) then return false;end if;
 if f->>'scope'='course' then if jsonb_array_length(q.units)<>jsonb_array_length(d->'units') or exists(select 1 from jsonb_array_elements(d->'units') u where not(q.units ? (u->>'slug'))) then return false;end if;
 elsif q.units<>jsonb_build_array(f->>'unit') then return false;end if;
 response=public.v3_nonresponse_response(d,r.fingerprint,f);
 if q.requested_at is distinct from coalesce((response->>'at')::timestamptz,(f->>'at')::timestamptz) then return false;end if;
 if coalesce(response->>'id','')<>coalesce(q.response_id,'') then return false;end if;
 if f#>>'{declarationReopen,findingAt}'=f->>'at' and public.v3_review_evidence_current(d,f,f#>>'{declarationReopen,fingerprint}',r.fingerprint) then return false;end if;
 if f->>'outcome'='satisfied' then writer=f->>'author';decisions=coalesce(f->'workflowEndorsements','[]');
 else
  writer=response->>'email';decisions=coalesce(response->'endorsements','[]');
  if response is null or response->>'findingAt' is distinct from f->>'at' or not public.v3_review_evidence_current(d,f,response->>'fingerprint',r.fingerprint)
   or coalesce(response->>'implemented','') not in ('yes','no') or length(trim(coalesce(response->>'notes','')))<5 or writer is distinct from coalesce(d->>'designerEmail',d->>'requester')
   or not exists(select 1 from auth.users u where u.id::text=response->>'userId' and lower(u.email)=writer and u.email_confirmed_at is not null)
   or response#>>'{decision,decision}'='reopen' or response ? 'endorsementReopen' then return false;end if;
 end if;
 if writer=q.recipient or p->>'userId'=(case when f->>'outcome'='satisfied' then f->>'userId' else response->>'userId' end) then return false;end if;
 if exists(select 1 from jsonb_array_elements(coalesce(f->'replies','[]')) reply where reply->>'email'=q.recipient and (reply->>'at')::timestamptz>=q.created_at) then return false;end if;
 for endorsement in select e from jsonb_array_elements(decisions) e loop
  if endorsement->>'findingAt'=f->>'at' and public.v3_review_evidence_current(d,f,endorsement->>'fingerprint',r.fingerprint)
   and endorsement->>'decision'='yes' and endorsement->>'email'<>writer
   and exists(select 1 from auth.users u,jsonb_array_elements(d->'participants') a where u.id::text=endorsement->>'userId' and u.email_confirmed_at is not null and lower(u.email)=endorsement->>'email' and a->>'email'=lower(u.email) and a->>'state'<>'declined' and public.v2_review_task_assigned(a,'content')) then return false;end if;
 end loop;return true;
end $$;

create function public.v3_queue_review_responses(p_round uuid,p_revision integer,p_requests jsonb,p_mail jsonb) returns integer language plpgsql security invoker set search_path='' as $$
declare r public.course_review_rounds;m jsonb;a jsonb;q public.course_review_response_requests;added integer=0;
begin
 select * into r from public.course_review_rounds where id=p_round for update;
 if r.status is distinct from 'open' or r.revision<>p_revision or r.document#>>'{nonresponsePolicy,roundId}' is distinct from p_round::text then raise exception 'REVIEW_CONFLICT';end if;
 for m in select e from jsonb_array_elements(p_mail) e loop
  if position('Seven-day response rule:' in m->>'body')=0 then raise exception 'Policy notice required';end if;
  insert into public.course_review_mail(round_id,notification_key,recipient,kind,subject,body) values(p_round,m->>'key',m->>'to',m->>'kind',m->>'subject',m->>'body') on conflict(notification_key) do nothing;
 end loop;
 for a in select e from jsonb_array_elements(p_requests) e loop
  if a->>'fingerprint' is distinct from r.fingerprint then raise exception 'Stale response request';end if;
  if not exists(select 1 from public.course_review_mail mail where mail.notification_key=a->>'noticeKey' and mail.round_id=p_round and mail.recipient=a->>'recipient' and mail.created_at>=greatest((r.document#>>'{nonresponsePolicy,enabledAt}')::timestamptz,(a->>'requestedAt')::timestamptz) and position('Seven-day response rule:' in mail.body)>0) then raise exception 'Notified policy required';end if;
  insert into public.course_review_response_requests as existing(round_id,request_key,kind,recipient,fingerprint,units,finding_id,finding_at,response_id,notice_key,requested_at)
  values(p_round,a->>'key',a->>'kind',a->>'recipient',a->>'fingerprint',a->'units',a->>'findingId',a->>'findingAt',a->>'responseId',a->>'noticeKey',(a->>'requestedAt')::timestamptz) on conflict(round_id,request_key) do update set notice_key=excluded.notice_key where existing.notified_at is null and existing.state='pending' returning * into q;
  if q.id is not null then
   if not public.v3_response_request_pending(q) then update public.course_review_response_requests set state='cancelled' where id=q.id;
   else
    update public.course_review_response_requests req set notified_at=mail.sent_at,due_at=mail.sent_at+interval '7 days' from public.course_review_mail mail where req.id=q.id and mail.notification_key=req.notice_key and mail.state='sent' and mail.sent_at is not null;
    added=added+1;
   end if;
  end if;
 end loop;return added;
end $$;

create function public.v3_process_review_nonresponses() returns integer language plpgsql security invoker set search_path='' as $$
declare r public.course_review_rounds;q public.course_review_response_requests;d jsonb;e jsonb;mail jsonb;at_time timestamptz;recipient text;body text;reference_label text;next_revision integer;total integer=0;index_value integer;
begin
 update public.course_review_response_requests req set state='cancelled' from public.course_review_rounds rr where req.round_id=rr.id and req.state='pending' and rr.status<>'open';
 for r in select rr.* from public.course_review_rounds rr where rr.status='open' and rr.document#>>'{nonresponsePolicy,version}'='1' order by rr.id for update skip locked loop
  for q in select req.* from public.course_review_response_requests req where req.round_id=r.id and req.state='pending' order by req.due_at nulls last,req.created_at,req.id for update loop
   if not public.v3_response_request_pending(q) then update public.course_review_response_requests set state='cancelled' where id=q.id;continue;end if;
   if q.notified_at is null then continue;end if;
   select document,revision into d,r.revision from public.course_review_rounds where id=r.id;
   if (d->>'cutoff')::timestamptz<q.due_at then
    d=jsonb_set(d,'{cutoff}',to_jsonb(q.due_at));
    d=jsonb_set(d,'{events}',coalesce(d->'events','[]')||jsonb_build_array(jsonb_build_object('actor','system','at',clock_timestamp(),'action','nonresponse_window_extended','detail','Review cutoff extended to preserve the full seven-day response period promised in notice '||q.notice_key)));
    r.revision=public.v2_commit_course_review(r.id,r.revision,d,null,'nonresponse_window_extended','[]');
    update public.course_review_join_tokens set expires_at=q.due_at where round_id=r.id and email=q.recipient and expires_at<q.due_at;
   end if;
   if q.due_at>clock_timestamp() then continue;end if;
   at_time=clock_timestamp();update public.course_review_response_requests set state='deemed',deemed_at=at_time where id=q.id;
   select document,revision into d,r.revision from public.course_review_rounds where id=r.id;
   e=jsonb_strip_nulls(jsonb_build_object('requestId',q.id,'kind',q.kind,'recipient',q.recipient,'fingerprint',q.fingerprint,'units',q.units,'notifiedAt',q.notified_at,'dueAt',q.due_at,'at',at_time,'findingId',q.finding_id,'findingAt',q.finding_at,'responseId',q.response_id));
   d=jsonb_set(d,'{deemedEndorsements}',coalesce(d->'deemedEndorsements','[]')||jsonb_build_array(e));
   if q.kind='endorsement' then
    select ordinality::integer-1 into index_value from jsonb_array_elements(d->'findings') with ordinality f where f.value->>'id'=q.finding_id;
    d=jsonb_set(d,array['findings',index_value::text,'status'],'"closed"');
   end if;
   if q.kind='initial' then reference_label='Initial course review';
   else select case when jsonb_array_length(q.units)>1 then 'All learning units' else upper(f->>'unit')||' · '||coalesce((select u->>'title' from jsonb_array_elements(d->'units') u where u->>'slug'=f->>'unit'),f->>'unit') end||' · '||coalesce(f->>'reference','Review finding') into reference_label from jsonb_array_elements(d->'findings') f where f->>'id'=q.finding_id;end if;
   body='Deemed endorsement — no response.'||E'\nCourse: '||(d->>'title')||E'\nRequest: '||reference_label||E'\nReviewer: '||q.recipient||E'\nNotice sent: '||to_char(q.notified_at at time zone 'Africa/Johannesburg','YYYY-MM-DD HH24:MI')||' SAST'||E'\nResponse deadline: '||to_char(q.due_at at time zone 'Africa/Johannesburg','YYYY-MM-DD HH24:MI')||' SAST'||E'\nUnder the notified seven-day rule, no response was recorded on the platform within seven calendar days. The system recorded a deemed content endorsement. This is not an actual review or personal approval. Unimplemented findings, commercial/branding approvals and final publication remain separate.';
   d=jsonb_set(d,'{events}',coalesce(d->'events','[]')||jsonb_build_array(jsonb_build_object('actor','system','at',at_time,'action','deemed_content_endorsement','detail',body||' Request: '||q.id)));
   mail='[]';for recipient in select distinct address from unnest(array[q.recipient,d->>'requester']) address loop
    mail=mail||jsonb_build_array(jsonb_build_object('key','deemed:'||q.id||':'||recipient,'to',recipient,'kind','deemed_endorsement','subject',(d->>'title')||': deemed endorsement — no response','body',body||E'\nOpen the review: https://training-platform-v2-staging.vercel.app/course-reviews/'||r.id||case when q.finding_id is not null then '#finding-'||q.finding_id else '#review-process' end));
   end loop;
   next_revision=public.v2_commit_course_review(r.id,r.revision,d,null,'deemed_content_endorsement',mail);r.revision=next_revision;total=total+1;
  end loop;
 end loop;return total;
end $$;

-- Keep the final publication gate equivalent to the application: timed results
-- require durable sent-notice and deadline evidence from the request table.
do $$
declare definition text;before_text text;after_text text;
begin
 select pg_get_functiondef('public.v3_lu_review_ready(jsonb,text)'::regprocedure) into definition;
 before_text='if n<2 or (select count(distinct p->>''userId'')';
 if position(before_text in definition)=0 then raise exception 'Expected account gate missing';end if;
 definition=replace(definition,'if n<2 or (select count(distinct p->>''userId'') from jsonb_array_elements(p_document->''participants'') p where p->>''role''=''primary'' and p->>''state''<>''declined'' and public.v2_review_task_assigned(p,''content''))<>n then return false;end if;',
 'if n<2 or (select count(distinct p->>''email'') from jsonb_array_elements(p_document->''participants'') p where p->>''role''=''primary'' and p->>''state''<>''declined'' and public.v2_review_task_assigned(p,''content''))<>n then return false;end if;
 if exists(select 1 from jsonb_array_elements(p_document->''participants'') p where p->>''role''=''primary'' and p->>''state''<>''declined'' and public.v2_review_task_assigned(p,''content'') and exists(select 1 from jsonb_array_elements(p_document->''units'') u where not public.v3_person_deemed(p_document,p_fingerprint,p->>''email'',u->>''slug'')) group by p->>''userId'' having count(*)>1) then return false;end if;');
 before_text='if not exists(select 1 from auth.users u where u.id::text=person->>''userId'' and lower(u.email)=person->>''email'' and u.email_confirmed_at is not null) then return false;end if;';
 after_text='if not exists(select 1 from auth.users u where u.id::text=person->>''userId'' and lower(u.email)=person->>''email'' and u.email_confirmed_at is not null) and exists(select 1 from jsonb_array_elements(p_document->''units'') u where not public.v3_person_deemed(p_document,p_fingerprint,person->>''email'',u->>''slug'')) then return false;end if;';
 if position(before_text in definition)=0 then raise exception 'Expected verified identity gate missing';end if;definition=replace(definition,before_text,after_text);
 definition=replace(definition,'if not (coalesce(person->''coverage'',''[]'') ? (unit->>''slug'')) or not exists',
 'if public.v3_person_deemed(p_document,p_fingerprint,person->>''email'',unit->>''slug'') then continue;end if; if not (coalesce(person->''coverage'',''[]'') ? (unit->>''slug'')) or not exists');
 definition=replace(definition,'if public.v3_clean_lu_review_ready(p_document,p_fingerprint,f->>''unit'') then continue;end if;',
 'if public.v3_clean_lu_review_ready(p_document,p_fingerprint,f->>''unit'') or public.v3_finding_deemed(p_document,p_fingerprint,f) then continue;end if;');
 execute definition;
 select pg_get_functiondef('public.v2_publish_reviewed_course(uuid,integer,uuid,text)'::regprocedure) into definition;
 definition=replace(definition,'if jsonb_array_length(coalesce(r.document->''contentRevisions'',''[]''::jsonb))>0 and exists(select 1 from jsonb_array_elements(r.document->''findings'')',
 'if r.document->>''reviewProcessVersion'' is distinct from ''3'' and jsonb_array_length(coalesce(r.document->''contentRevisions'',''[]''::jsonb))>0 and exists(select 1 from jsonb_array_elements(r.document->''findings'')');
 definition=replace(definition,'if exists(select 1 from jsonb_array_elements(r.document->''findings'') f where (f->>''blocking'')::boolean and f->>''status''<>''closed'')',
 'if r.document->>''reviewProcessVersion'' is distinct from ''3'' and exists(select 1 from jsonb_array_elements(r.document->''findings'') f where (f->>''blocking'')::boolean and f->>''status''<>''closed'')');
 definition=replace(definition,'Complete every LU review, response decision and additional endorsement','Complete each LU review and its required explicit or deemed endorsements');
 execute definition;
end $$;

create function public.v3_enable_review_nonresponse(p_round uuid,p_revision integer,p_actor uuid) returns integer language plpgsql security invoker set search_path='' as $$
declare r public.course_review_rounds;d jsonb;p jsonb;mail jsonb='[]';at_time timestamptz=now();body text;
begin
 if not public.v2_is_platform_principal(p_actor) then raise exception 'Principal required';end if;
 select * into r from public.course_review_rounds where id=p_round for update;
 if r.status is distinct from 'open' or r.revision<>p_revision or r.document->>'reviewProcessVersion' is distinct from '3' then raise exception 'REVIEW_CONFLICT';end if;
 if r.document#>>'{nonresponsePolicy,version}'='1' then return r.revision;end if;
 d=jsonb_set(r.document,'{nonresponsePolicy}',jsonb_build_object('version',1,'days',7,'enabledAt',at_time,'enabledBy',p_actor,'roundId',r.id));
 body='Seven-day response rule: a new condition now applies to this course content review. If you do not respond to the first review invitation or a specific endorsement request within seven calendar days of its successfully sent notice, the platform records “Deemed endorsement — no response” and notifies you. Existing requests receive a fresh notice and seven-day period; earlier invitations are not counted retroactively. This is not an actual review or a personal approval. Unimplemented findings, commercial terms, branding approvals and final publication are not approved automatically. Opening or reading an email alone is not a response. Open your assigned actions: https://training-platform-v2-staging.vercel.app/course-reviews/'||r.id||'#review-process';
 for p in select a from jsonb_array_elements(d->'participants') a where a->>'state'<>'declined' and public.v2_review_task_assigned(a,'content') loop
  mail=mail||jsonb_build_array(jsonb_build_object('key','nonresponse-policy:'||r.id||':'||(p->>'email'),'to',p->>'email','kind','review_policy_notice','subject',(d->>'title')||': new seven-day content review rule','body',body));
 end loop;
 d=jsonb_set(d,'{events}',coalesce(d->'events','[]')||jsonb_build_array(jsonb_build_object('actor','system','at',at_time,'action','nonresponse_policy_enabled','detail','Seven-day content-only nonresponse rule enabled at the owner’s explicit request. Fresh notices queued.')));
 return public.v2_commit_course_review(r.id,r.revision,d,p_actor,'nonresponse_policy_enabled',mail);
end $$;

revoke all on function public.v3_review_mail_sent_clock(),public.v3_review_request_delivery_clock(),public.v3_deemed_record_valid(jsonb,text,jsonb,text),public.v3_nonresponse_response(jsonb,text,jsonb),public.v3_finding_deemed(jsonb,text,jsonb,text),public.v3_person_deemed(jsonb,text,text,text),public.v3_initial_review_responded(jsonb,text),public.v3_response_request_pending(public.course_review_response_requests),public.v3_queue_review_responses(uuid,integer,jsonb,jsonb),public.v3_process_review_nonresponses(),public.v3_enable_review_nonresponse(uuid,integer,uuid) from public,anon,authenticated;
grant execute on function public.v3_deemed_record_valid(jsonb,text,jsonb,text),public.v3_nonresponse_response(jsonb,text,jsonb),public.v3_finding_deemed(jsonb,text,jsonb,text),public.v3_person_deemed(jsonb,text,text,text),public.v3_initial_review_responded(jsonb,text),public.v3_response_request_pending(public.course_review_response_requests),public.v3_queue_review_responses(uuid,integer,jsonb,jsonb),public.v3_process_review_nonresponses(),public.v3_enable_review_nonresponse(uuid,integer,uuid) to service_role;

create function public.v3_review_response_notice_pending(p_key text) returns boolean language sql stable security invoker set search_path='' as $$select exists(select 1 from public.course_review_response_requests q where q.notice_key=p_key and q.state='pending' and public.v3_response_request_pending(q));$$;
revoke all on function public.v3_review_response_notice_pending(text) from public,anon,authenticated;
grant execute on function public.v3_review_response_notice_pending(text) to service_role;
notify pgrst,'reload schema';
