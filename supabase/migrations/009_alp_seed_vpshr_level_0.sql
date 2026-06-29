-- ALP W2 - Seed VPSHR Level 0 read-only course metadata

insert into public.courses (
  id,
  slug,
  title,
  level,
  description,
  audience,
  duration,
  source_root,
  status
) values (
  'vpshr-level-0',
  'vpshr-level-0',
  'VPSHR Level 0',
  'Foundational awareness',
  'A responsive learning pathway for the Voluntary Principles on Security and Human Rights, built around the published VPSHR course files already stored in this repository.',
  'Security teams, site leaders, contractors, and employees who need a practical baseline in human rights responsibilities.',
  '12 learning units plus orientation',
  '/courses/vpshr-level-0',
  'published'
)
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  level = excluded.level,
  description = excluded.description,
  audience = excluded.audience,
  duration = excluded.duration,
  source_root = excluded.source_root,
  status = excluded.status,
  updated_at = now();

insert into public.course_modules (id, course_id, slug, title, display_order)
values ('vpshr-level-0-core', 'vpshr-level-0', 'core', 'VPSHR Level 0 pathway', 1)
on conflict (id) do update set
  title = excluded.title,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.learning_units (
  id,
  course_id,
  module_id,
  slug,
  legacy_slug,
  title,
  subtitle,
  duration,
  display_order,
  asset_base,
  published_path
) values
  ('intro', 'vpshr-level-0', 'vpshr-level-0-core', 'introduction', 'introduction', 'Introduction to VPSHR Level 0', 'Set the context for rights-aware security practice.', '5 min', 0, '/courses/vpshr-level-0/introduction', '/courses/vpshr-level-0/introduction/index.html'),
  ('lu1', 'vpshr-level-0', 'vpshr-level-0-core', 'lu1', 'unit1', 'Definition of Human Rights', 'Build a shared vocabulary for rights and responsibilities.', '10 min', 1, '/courses/vpshr-level-0/LU1 Definition', '/courses/vpshr-level-0/LU1 Definition/index.html'),
  ('lu2', 'vpshr-level-0', 'vpshr-level-0-core', 'lu2', 'unit2', 'Responsibilities', 'Clarify who carries which responsibilities in a VPSHR environment.', '12 min', 2, '/courses/vpshr-level-0/LU2 Responsibilities', '/courses/vpshr-level-0/LU2 Responsibilities/index.html'),
  ('lu3', 'vpshr-level-0', 'vpshr-level-0-core', 'lu3', 'unit3', 'Benefits of Human Rights', 'Connect rights practice to trust, resilience, and safer operations.', '10 min', 3, '/courses/vpshr-level-0/LU3 benefits-human-rights', '/courses/vpshr-level-0/LU3 benefits-human-rights/index.html'),
  ('lu4', 'vpshr-level-0', 'vpshr-level-0-core', 'lu4', 'unit4', 'Thirty Human Rights', 'Explore the rights baseline behind VPSHR decision-making.', '12 min', 4, '/courses/vpshr-level-0/LU4 30-human-rights', '/courses/vpshr-level-0/LU4 30-human-rights/index.html'),
  ('lu5', 'vpshr-level-0', 'vpshr-level-0-core', 'lu5', 'unit5', 'Factors That May Contribute to Human Rights Risk', 'Spot early indicators before incidents escalate.', '15 min', 5, '/courses/vpshr-level-0/LU5 Factors-contributing/5. Basic human rights-final (Published)/6. Factors that may contribute-final (Published)', '/courses/vpshr-level-0/LU5 Factors-contributing/5. Basic human rights-final (Published)/6. Factors that may contribute-final (Published)/index.html'),
  ('lu6', 'vpshr-level-0', 'vpshr-level-0-core', 'lu6', 'unit6', 'Role of Employees', 'Make human rights awareness part of everyday conduct.', '15 min', 6, '/courses/vpshr-level-0/LU6 Role-of-Employees', '/courses/vpshr-level-0/LU6 Role-of-Employees/index.html'),
  ('lu7', 'vpshr-level-0', 'vpshr-level-0-core', 'lu7', 'unit7', 'Key Policy Requirements', 'Turn policy commitments into working controls.', '12 min', 7, '/courses/vpshr-level-0/LU7 Key-policy-requirements/8. Key policy requirements - final (Published)', '/courses/vpshr-level-0/LU7 Key-policy-requirements/8. Key policy requirements - final (Published)/index.html'),
  ('lu8', 'vpshr-level-0', 'vpshr-level-0-core', 'lu8', 'unit8', 'Voluntary Principles on Security and Human Rights', 'Understand the VPSHR framework and its operating expectations.', '18 min', 8, '/courses/vpshr-level-0/LU8 VPSHR', '/courses/vpshr-level-0/LU8 VPSHR/index.html'),
  ('lu9', 'vpshr-level-0', 'vpshr-level-0-core', 'lu9', 'unit9', 'Role of Security', 'Apply VPSHR expectations to security team conduct.', '20 min', 9, '/courses/vpshr-level-0/LU9 Role-of-security', '/courses/vpshr-level-0/LU9 Role-of-security/index.html')
on conflict (id) do update set
  slug = excluded.slug,
  legacy_slug = excluded.legacy_slug,
  title = excluded.title,
  subtitle = excluded.subtitle,
  duration = excluded.duration,
  display_order = excluded.display_order,
  asset_base = excluded.asset_base,
  published_path = excluded.published_path,
  updated_at = now();

insert into public.content_links (course_id, unit_id, link_type, label, href, is_read_only)
select course_id, id, 'published_unit', title, published_path, true
from public.learning_units
where course_id = 'vpshr-level-0'
on conflict do nothing;
