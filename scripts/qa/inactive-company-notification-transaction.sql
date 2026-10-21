begin;
do $$
declare actor uuid;org uuid=gen_random_uuid();request_id uuid=gen_random_uuid();n public.admin_notifications;target text;
begin
 select user_id into actor from public.platform_principals where user_id is not null limit 1;
 if actor is null then raise exception 'Verified principal fixture required';end if;
 insert into public.organisations(id,slug,name,is_active) values(org,'notice-regression-'||org,'Notification regression fixture',true);
 insert into public.company_change_requests(id,organisation_id,requested_by,subject,description,status) values(request_id,org,actor,'Notification regression','Temporary transaction-only request','submitted');
 select * into n from public.admin_notifications where recipient_user_id=actor and source_type='company_request' and source_id=request_id;
 if n.id is null or not public.v2_notification_pending(n) then raise exception 'Active company request must remain actionable';end if;
 target=public.v2_notification_receipt(actor,n.id,'read');
 if target<>'/company/'||org||'#company-requests' then raise exception 'Active request target is incorrect';end if;
 update public.organisations set is_active=false where id=org;
 if public.v2_notification_pending(n) then raise exception 'Inactive company must not require a response';end if;
 target=public.v2_notification_receipt(actor,n.id,'read');
 if target<>'/notifications#archived-company-request' then raise exception 'Inactive request must open safe history guidance';end if;
 if not exists(select 1 from public.company_change_requests where id=request_id and status='submitted') then raise exception 'Notification handling must not approve or resolve a request';end if;
 if not exists(select 1 from public.admin_notifications where id=n.id and read_at is not null) then raise exception 'Receipt history must be retained';end if;
 if has_function_privilege('authenticated','public.v2_notification_receipt(uuid,uuid,text)','EXECUTE') then raise exception 'RPC must remain private';end if;
end $$;
rollback;
