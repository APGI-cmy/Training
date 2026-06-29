-- ALP W2 - Dashboard + Course Shell + Unit Viewer schema

create table if not exists public.courses (
  id text primary key,
  slug text not null unique,
  title text not null,
  level text not null,
  description text not null,
  audience text,
  duration text,
  source_root text,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_modules (
  id text primary key,
  course_id text not null references public.courses(id) on delete cascade,
  slug text not null,
  title text not null,
  display_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, slug)
);

create table if not exists public.learning_units (
  id text primary key,
  course_id text not null references public.courses(id) on delete cascade,
  module_id text references public.course_modules(id) on delete set null,
  slug text not null,
  legacy_slug text,
  title text not null,
  subtitle text,
  duration text,
  display_order integer not null,
  asset_base text,
  published_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, slug)
);

create table if not exists public.content_links (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  unit_id text references public.learning_units(id) on delete cascade,
  link_type text not null check (link_type in ('legacy_landing', 'published_unit', 'embed', 'fallback', 'asset')),
  label text not null,
  href text not null,
  is_read_only boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_course_modules_course_id on public.course_modules(course_id);
create index if not exists idx_learning_units_course_id on public.learning_units(course_id);
create index if not exists idx_learning_units_module_id on public.learning_units(module_id);
create index if not exists idx_content_links_course_id on public.content_links(course_id);
create index if not exists idx_content_links_unit_id on public.content_links(unit_id);

alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.learning_units enable row level security;
alter table public.content_links enable row level security;

drop policy if exists courses_select_published_or_staff on public.courses;
create policy courses_select_published_or_staff
on public.courses
for select
using (
  status = 'published'
  or public.current_user_has_any_role(array['admin', 'reviewer', 'course_publisher'])
);

drop policy if exists course_modules_select_authenticated on public.course_modules;
create policy course_modules_select_authenticated
on public.course_modules
for select
using (auth.uid() is not null);

drop policy if exists learning_units_select_authenticated on public.learning_units;
create policy learning_units_select_authenticated
on public.learning_units
for select
using (auth.uid() is not null);

drop policy if exists content_links_select_authenticated on public.content_links;
create policy content_links_select_authenticated
on public.content_links
for select
using (auth.uid() is not null);
