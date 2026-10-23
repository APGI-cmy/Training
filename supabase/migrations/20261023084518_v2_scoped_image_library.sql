create table public.v2_image_library(
 id uuid primary key default gen_random_uuid(),
 organisation_id uuid not null references public.organisations(id),
 title text not null check(length(title) between 1 and 120),
 course_id text references public.courses(id),
 purpose text not null check(purpose in('course','email','both')),
 object_path text not null unique,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index v2_image_library_company_course on public.v2_image_library(organisation_id,course_id,created_at desc);
alter table public.v2_image_library enable row level security;
revoke all on public.v2_image_library from public,anon,authenticated;
grant select,insert on public.v2_image_library to service_role;
create function public.v2_image_library_list(p_actor uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(i) order by i.created_at desc),'[]'::jsonb) from public.v2_image_library i where public.v2_message_admin(p_actor,i.organisation_id);
$$;
create function public.v2_image_library_add(p_actor uuid,p_org uuid,p_title text,p_course text,p_purpose text,p_path text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare image public.v2_image_library;
begin
 if not coalesce(public.v2_message_admin(p_actor,p_org),false) then raise exception 'Administrator access required for this company';end if;
 if coalesce(length(trim(p_title)),0) not between 1 and 120 or p_purpose is null or p_purpose not in('course','email','both') then raise exception 'Choose an image title and its intended use';end if;
 if p_path is null or p_path !~ ('^'||p_org::text||'/[0-9a-f-]{36}\.jpg$') then raise exception 'Invalid image location';end if;
 if not exists(select 1 from storage.objects where bucket_id='email-message-images' and name=p_path) then raise exception 'Upload the image before adding it to the library';end if;
 insert into public.v2_image_library(organisation_id,title,course_id,purpose,object_path,created_by) values(p_org,trim(p_title),nullif(p_course,''),p_purpose,p_path,p_actor) returning * into image;
 return to_jsonb(image);
end $$;
revoke all on function public.v2_image_library_list(uuid),public.v2_image_library_add(uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.v2_image_library_list(uuid),public.v2_image_library_add(uuid,uuid,text,text,text,text) to service_role;
