-- Compatibility test only. No enrolment, offering, price or certificate policy is created.
insert into public.courses(id,slug,title,level,description,audience,duration,source_root,status)
values('executive-assistant-lu1-compatibility','executive-assistant-lu1-compatibility','Executive Assistant Training Programme — LU1 compatibility test','Technical compatibility pilot','A frozen web-native LU1 pilot for administrator and assigned-reviewer testing.','Invited technical reviewers','LU1 test only','/courses/Executive%20Assistant%20Training%20Programme','draft') on conflict(id) do nothing;
insert into public.course_modules(id,course_id,slug,title,display_order)
values('ea-lu1-compatibility-core','executive-assistant-lu1-compatibility','core','LU1 technical pilot',1) on conflict(id) do nothing;
insert into public.learning_units(id,course_id,module_id,slug,title,subtitle,duration,display_order,asset_base,published_path)
values('ea-lu1-compatibility-unit-1','executive-assistant-lu1-compatibility','ea-lu1-compatibility-core','lu1','The executive partnership','Web-native compatibility pilot','Self-paced test',1,'/courses/Executive%20Assistant%20Training%20Programme','/courses/Executive%20Assistant%20Training%20Programme/course/ebook.html') on conflict(id) do nothing;
insert into public.course_catalogue_settings(course_id,visibility)
values('executive-assistant-lu1-compatibility','client_specific') on conflict(course_id) do nothing;
