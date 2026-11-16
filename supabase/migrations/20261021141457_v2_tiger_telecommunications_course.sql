-- Import readiness is separate from review approval and company publication.
insert into public.courses (id,slug,title,level,description,audience,duration,source_root,status) values ('tiger-kidnapping-telecommunications','tiger-kidnapping-telecommunications','Tiger Kidnapping in Telecommunications','Executive and family awareness','An eight-unit awareness programme covering telecommunications-related kidnapping threats, exposure, warning signs, protective controls, reporting, response under duress, and recovery.','Telecommunications executives, employees and their families','8 self-paced learning units','/courses/Tiger%20kidnapping_telecommunications','draft') on conflict (id) do nothing;
insert into public.course_modules(id,course_id,slug,title,display_order) values ('tiger-telecom-core','tiger-kidnapping-telecommunications','core','Tiger Kidnapping in Telecommunications',1) on conflict(id) do nothing;
insert into public.learning_units(id,course_id,module_id,slug,title,subtitle,duration,display_order,asset_base,published_path) values
('tiger-telecom-lu-1','tiger-kidnapping-telecommunications','tiger-telecom-core','lu1','The Threat in a Telecommunications Context','Review the published presentation and its included quiz.','Self-paced',1,'/courses/Tiger%20kidnapping_telecommunications/LU1','/courses/Tiger%20kidnapping_telecommunications/LU1/res/index.html'),
('tiger-telecom-lu-2','tiger-kidnapping-telecommunications','tiger-telecom-core','lu2','Personal, Family and Digital Exposure','Review the published presentation and its included quiz.','Self-paced',2,'/courses/Tiger%20kidnapping_telecommunications/LU2','/courses/Tiger%20kidnapping_telecommunications/LU2/res/index.html'),
('tiger-telecom-lu-3','tiger-kidnapping-telecommunications','tiger-telecom-core','lu3','Early Warning Signs','Review the published presentation and its included quiz.','Self-paced',3,'/courses/Tiger%20kidnapping_telecommunications/LU3','/courses/Tiger%20kidnapping_telecommunications/LU3/res/index.html'),
('tiger-telecom-lu-4','tiger-kidnapping-telecommunications','tiger-telecom-core','lu4','Corporate Protective Controls','Review the published presentation and its included quiz.','Self-paced',4,'/courses/Tiger%20kidnapping_telecommunications/LU4','/courses/Tiger%20kidnapping_telecommunications/LU4/res/index.html'),
('tiger-telecom-lu-5','tiger-kidnapping-telecommunications','tiger-telecom-core','lu5','Unit 5 — Package Correction Required','Uploaded package identifies itself as Unit 4; correction required.','Self-paced',5,'/courses/Tiger%20kidnapping_telecommunications/LU5','/courses/Tiger%20kidnapping_telecommunications/LU5/res/index.html'),
('tiger-telecom-lu-6','tiger-kidnapping-telecommunications','tiger-telecom-core','lu6','Suspicion and Reporting','Review the published presentation and its included quiz.','Self-paced',6,'/courses/Tiger%20kidnapping_telecommunications/LU6','/courses/Tiger%20kidnapping_telecommunications/LU6/res/index.html'),
('tiger-telecom-lu-7','tiger-kidnapping-telecommunications','tiger-telecom-core','lu7','Response under Duress','Review the published presentation and its included quiz.','Self-paced',7,'/courses/Tiger%20kidnapping_telecommunications/LU7','/courses/Tiger%20kidnapping_telecommunications/LU7/res/index.html'),
('tiger-telecom-lu-8','tiger-kidnapping-telecommunications','tiger-telecom-core','lu8','Recovery, Care and Assurance','Review the published presentation and its included quiz.','Self-paced',8,'/courses/Tiger%20kidnapping_telecommunications/LU8','/courses/Tiger%20kidnapping_telecommunications/LU8/res/index.html') on conflict(id) do nothing;
insert into public.course_completion_requirements(course_id,required_unit_ids,require_assessor_pass) values ('tiger-kidnapping-telecommunications',array['tiger-telecom-lu-1','tiger-telecom-lu-2','tiger-telecom-lu-3','tiger-telecom-lu-4','tiger-telecom-lu-5','tiger-telecom-lu-6','tiger-telecom-lu-7','tiger-telecom-lu-8'],false) on conflict(course_id) do nothing;
insert into public.course_catalogue_settings(course_id,visibility) values ('tiger-kidnapping-telecommunications','client_specific') on conflict(course_id) do nothing;

-- A draft package can be reviewed and priced, but cannot become a published
-- company offering. Clearing this flag requires a validated corrected import;
-- the existing independent review, commercial and branding gates still apply.
create function public.v2_require_ready_course_package() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.status='published' and exists(select 1 from public.courses c where c.id=new.course_id and c.status='draft') then
  raise exception 'Course package corrections required before learner publication';
 end if;
 return new;
end $$;
revoke all on function public.v2_require_ready_course_package() from public,anon,authenticated;
grant execute on function public.v2_require_ready_course_package() to service_role;
create trigger v2_require_ready_course_package before insert or update of status,course_id
on public.organisation_offerings for each row execute function public.v2_require_ready_course_package();
