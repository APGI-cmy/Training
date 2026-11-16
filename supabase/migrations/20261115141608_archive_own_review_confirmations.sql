-- Confirmations of a recipient's own saved action belong in retained history.
-- Other reviewers' updates and actual outstanding requests remain active.
create or replace function public.v5_notification_retired(n public.admin_notifications) returns boolean
language sql stable set search_path='' as $$
 select coalesce(n.source_type='review' and (
   n.event_key like 'review-task:%'
   or coalesce(n.context->>'legacy_review_reminder','false')='true'
   or (n.response_type='read' and n.event_key like 'course-review:%'
       and lower(public.v3_notification_payload(n)->'event'->>'actor')=
           (select lower(u.email) from auth.users u where u.id=n.recipient_user_id))
 ),false);
$$;
update public.v5_notification_mail q set state='superseded'
from public.admin_notifications n where n.id=q.notification_id
and public.v5_notification_retired(n) and q.state in('pending','failed');
