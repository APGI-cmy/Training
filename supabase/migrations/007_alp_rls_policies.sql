-- APGI Learning Portal W1 RLS policies
-- Scope: auth/profile/private-file isolation for W1.

alter table public.learners enable row level security;
alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;
alter table public.file_metadata enable row level security;
alter table public.audit_events enable row level security;

create or replace function public.current_user_has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = required_role
  );
$$;

create or replace function public.current_user_has_any_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = any(required_roles)
  );
$$;

drop policy if exists learners_select_self_or_admin on public.learners;
create policy learners_select_self_or_admin
on public.learners
for select
using (
  id = auth.uid()
  or public.current_user_has_role('admin')
);

drop policy if exists learners_insert_self_or_admin on public.learners;
create policy learners_insert_self_or_admin
on public.learners
for insert
with check (
  id = auth.uid()
  or public.current_user_has_role('admin')
);

drop policy if exists learners_update_self_or_admin on public.learners;
create policy learners_update_self_or_admin
on public.learners
for update
using (
  id = auth.uid()
  or public.current_user_has_role('admin')
)
with check (
  id = auth.uid()
  or public.current_user_has_role('admin')
);

drop policy if exists user_roles_select_self_or_admin on public.user_roles;
create policy user_roles_select_self_or_admin
on public.user_roles
for select
using (
  user_id = auth.uid()
  or public.current_user_has_role('admin')
);

drop policy if exists user_roles_admin_insert on public.user_roles;
create policy user_roles_admin_insert
on public.user_roles
for insert
with check (public.current_user_has_role('admin'));

drop policy if exists user_roles_admin_update on public.user_roles;
create policy user_roles_admin_update
on public.user_roles
for update
using (public.current_user_has_role('admin'))
with check (public.current_user_has_role('admin'));

drop policy if exists user_roles_admin_delete on public.user_roles;
create policy user_roles_admin_delete
on public.user_roles
for delete
using (public.current_user_has_role('admin'));

drop policy if exists profiles_select_self_or_staff on public.profiles;
create policy profiles_select_self_or_staff
on public.profiles
for select
using (
  user_id = auth.uid()
  or public.current_user_has_any_role(array['admin', 'reviewer'])
);

drop policy if exists profiles_insert_self_or_admin on public.profiles;
create policy profiles_insert_self_or_admin
on public.profiles
for insert
with check (
  user_id = auth.uid()
  or public.current_user_has_role('admin')
);

drop policy if exists profiles_update_self_unlocked_or_admin on public.profiles;
create policy profiles_update_self_unlocked_or_admin
on public.profiles
for update
using (
  public.current_user_has_role('admin')
  or (user_id = auth.uid() and certificate_profile_locked_at is null)
)
with check (
  public.current_user_has_role('admin')
  or (user_id = auth.uid() and certificate_profile_locked_at is null)
);

drop policy if exists file_metadata_select_owner_or_staff on public.file_metadata;
create policy file_metadata_select_owner_or_staff
on public.file_metadata
for select
using (
  owner_user_id = auth.uid()
  or public.current_user_has_any_role(array['admin', 'reviewer'])
);

drop policy if exists file_metadata_insert_owner_or_admin on public.file_metadata;
create policy file_metadata_insert_owner_or_admin
on public.file_metadata
for insert
with check (
  owner_user_id = auth.uid()
  or public.current_user_has_role('admin')
);

drop policy if exists file_metadata_update_owner_or_admin on public.file_metadata;
create policy file_metadata_update_owner_or_admin
on public.file_metadata
for update
using (
  owner_user_id = auth.uid()
  or public.current_user_has_role('admin')
)
with check (
  owner_user_id = auth.uid()
  or public.current_user_has_role('admin')
);

drop policy if exists audit_events_select_self_or_admin on public.audit_events;
create policy audit_events_select_self_or_admin
on public.audit_events
for select
using (
  actor_user_id = auth.uid()
  or target_user_id = auth.uid()
  or public.current_user_has_role('admin')
);

drop policy if exists audit_events_insert_authenticated on public.audit_events;
create policy audit_events_insert_authenticated
on public.audit_events
for insert
with check (auth.uid() is not null);

drop policy if exists storage_private_files_select_owner_or_staff on storage.objects;
create policy storage_private_files_select_owner_or_staff
on storage.objects
for select
using (
  bucket_id = 'alp-private-files'
  and (
    owner = auth.uid()
    or public.current_user_has_any_role(array['admin', 'reviewer'])
  )
);

drop policy if exists storage_private_files_insert_owner_path on storage.objects;
create policy storage_private_files_insert_owner_path
on storage.objects
for insert
with check (
  bucket_id = 'alp-private-files'
  and owner = auth.uid()
  and name like auth.uid()::text || '/%'
);

drop policy if exists storage_private_files_update_owner_path on storage.objects;
create policy storage_private_files_update_owner_path
on storage.objects
for update
using (
  bucket_id = 'alp-private-files'
  and owner = auth.uid()
  and name like auth.uid()::text || '/%'
)
with check (
  bucket_id = 'alp-private-files'
  and owner = auth.uid()
  and name like auth.uid()::text || '/%'
);

drop policy if exists storage_private_files_delete_owner_or_admin on storage.objects;
create policy storage_private_files_delete_owner_or_admin
on storage.objects
for delete
using (
  bucket_id = 'alp-private-files'
  and (
    owner = auth.uid()
    or public.current_user_has_role('admin')
  )
);
