-- A former reviewer must not receive new reminders for a removed assignment.
do $$
declare definition text;
begin
 select pg_get_functiondef('public.v4_remind_notification(uuid,uuid)'::regprocedure) into definition;
 definition=replace(definition,'perform public.v4_review_message_recipients(p_actor,n.source_id);',
 'if not exists(select 1 from jsonb_array_elements(public.v4_review_message_recipients(p_actor,n.source_id)) recipient where recipient->>''id''=n.recipient_user_id::text) then raise exception ''Recipient is no longer assigned to this review'';end if;');
 execute definition;
 select pg_get_functiondef('public.v4_notification_message(public.admin_notifications)'::regprocedure) into definition;
 definition=replace(definition,'r.status=''open'' and (r.document->>''cutoff'')',
 'r.status=''open'' and exists(select 1 from jsonb_array_elements(r.document->''participants'') person join auth.users recipient on lower(recipient.email)=person->>''email'' where recipient.id=n.recipient_user_id and person->>''state''<>''declined'') and (r.document->>''cutoff'')');
 execute definition;
end $$;
