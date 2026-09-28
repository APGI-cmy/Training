-- Course-scoped client branding. Course slugs are defined in the application,
-- so they are intentionally not foreign keys to a database courses table.
create table if not exists public.course_branding (
  course_id text primary key,
  brand_name text not null check (char_length(trim(brand_name)) between 2 and 120),
  logo_path text,
  primary_color text not null default '#0D2850' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#006B92' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#4C95B0' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  pale_color text not null default '#CCE1E9' check (pale_color ~ '^#[0-9A-Fa-f]{6}$'),
  footer_text text not null default 'Powered by APGI' check (char_length(trim(footer_text)) between 2 and 160),
  is_active boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.course_branding enable row level security;

-- Learner-facing logos are deliberately public assets. Branding settings remain
-- service-role-only and are exposed through the authenticated application.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'alp-branding-assets',
  'alp-branding-assets',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
