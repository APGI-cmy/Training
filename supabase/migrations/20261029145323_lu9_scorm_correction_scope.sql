-- Source-verified LU9 replacement. Preserve prior transitions; unknown changes require full recheck.
create or replace function public.v2_correction_recheck_units(
 p_id uuid,p_course text,p_previous text,p_fingerprint text,p_units jsonb)
returns jsonb language sql immutable security invoker set search_path='' as $scope$
 select case
 when p_id='4e26a845-4c1e-442a-87f8-2ad192647b37'::uuid and p_course='vpshr-level-0'
  and p_previous='37a1df4f248783b6f583595dd3c339586b933ef3dcc342653c4838cee6f4702b'
  and p_fingerprint='b47c284e32ff813100ba0cd63fefb09fcb67146ad73204f681067cecf72e7664'
 then '["lu5","lu11"]'::jsonb
 when p_id='4e26a845-4c1e-442a-87f8-2ad192647b37'::uuid and p_course='vpshr-level-0'
  and p_previous='b47c284e32ff813100ba0cd63fefb09fcb67146ad73204f681067cecf72e7664'
  and p_fingerprint='4f90eaf9ff306b9f77c0b6ed2543d4430a96e8e583519200c5879822eb3850f4'
 then '["introduction"]'::jsonb
 when p_id='4e26a845-4c1e-442a-87f8-2ad192647b37'::uuid and p_course='vpshr-level-0'
  and p_previous='4f90eaf9ff306b9f77c0b6ed2543d4430a96e8e583519200c5879822eb3850f4'
  and p_fingerprint='82420476dbb8d3855b681a8ce7f507268c0348ba79e47c4f20542cb907aeb8b4'
 then '["lu1"]'::jsonb
 when p_id='4e26a845-4c1e-442a-87f8-2ad192647b37'::uuid and p_course='vpshr-level-0'
  and p_previous='82420476dbb8d3855b681a8ce7f507268c0348ba79e47c4f20542cb907aeb8b4'
  and p_fingerprint='ec3b6a49faa2949ca97d55db2475d3954db3f2ac80a67748d905be3783d3bff5'
 then '["lu9"]'::jsonb
 else coalesce((select jsonb_agg(u->>'slug') from jsonb_array_elements(p_units) u),'[]'::jsonb) end;
$scope$;
revoke all on function public.v2_correction_recheck_units(uuid,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.v2_correction_recheck_units(uuid,text,text,text,jsonb) to service_role;
