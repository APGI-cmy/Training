-- APGI Learning Portal W1 file storage and audit schema subset
-- Scope: profile/private-file storage expectations and audit hooks required for W1.
-- Certificate and notification structures remain reserved for later waves.

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_events_actor_user_id on public.audit_events(actor_user_id);
create index if not exists idx_audit_events_target_user_id on public.audit_events(target_user_id);
create index if not exists idx_audit_events_event_type on public.audit_events(event_type);
create index if not exists idx_audit_events_created_at on public.audit_events(created_at desc);

create or replace function public.write_audit_event(
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_target_user_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  insert into public.audit_events (
    actor_user_id,
    target_user_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  ) values (
    auth.uid(),
    p_target_user_id,
    p_event_type,
    p_entity_type,
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function public.audit_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.write_audit_event(
    case when tg_op = 'INSERT' then 'profile.created' else 'profile.updated' end,
    'profiles',
    new.user_id,
    new.user_id,
    jsonb_build_object('operation', tg_op)
  );
  return new;
end;
$$;

drop trigger if exists audit_profiles_insert_update on public.profiles;
create trigger audit_profiles_insert_update
after insert or update on public.profiles
for each row execute function public.audit_profile_change();

create or replace function public.audit_file_metadata_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.write_audit_event(
    case when tg_op = 'INSERT' then 'file_metadata.created' else 'file_metadata.updated' end,
    'file_metadata',
    new.id,
    new.owner_user_id,
    jsonb_build_object(
      'operation', tg_op,
      'file_purpose', new.file_purpose,
      'bucket_id', new.bucket_id
    )
  );
  return new;
end;
$$;

drop trigger if exists audit_file_metadata_insert_update on public.file_metadata;
create trigger audit_file_metadata_insert_update
after insert or update on public.file_metadata
for each row execute function public.audit_file_metadata_change();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'alp-private-files',
  'alp-private-files',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
