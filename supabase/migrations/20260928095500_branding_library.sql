create table if not exists public.branding_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 2 and 120),
  logo_path text,
  primary_color text not null check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  pale_color text not null check (pale_color ~ '^#[0-9A-Fa-f]{6}$'),
  footer_text text not null check (char_length(trim(footer_text)) between 2 and 160),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.branding_presets enable row level security;

-- Preserve the course branding already configured before the reusable library
-- was introduced. Matching brand names are retained as one reusable preset.
insert into public.branding_presets (
  name, logo_path, primary_color, secondary_color, accent_color, pale_color,
  footer_text, updated_by, created_at, updated_at
)
select
  brand_name, logo_path, primary_color, secondary_color, accent_color, pale_color,
  footer_text, updated_by, created_at, updated_at
from public.course_branding
on conflict (name) do nothing;
