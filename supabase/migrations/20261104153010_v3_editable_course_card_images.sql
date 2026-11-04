-- Card artwork is presentation metadata; it does not alter course packages or review evidence.
create table public.v3_course_card_images (
 course_id text primary key references public.courses(id),
 image_id uuid references public.v2_image_library(id),
 shared_image text,
 alt_text text not null check(length(alt_text) between 1 and 250),
 updated_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now(),
 check ((image_id is not null)::int + (shared_image is not null)::int = 1)
);
create table public.v3_course_card_image_history (
 id uuid primary key default gen_random_uuid(), course_id text not null references public.courses(id),
 actor_id uuid not null references auth.users(id), previous_image jsonb, selected_image jsonb,
 created_at timestamptz not null default now()
);
alter table public.v3_course_card_images enable row level security;
alter table public.v3_course_card_image_history enable row level security;
revoke all on public.v3_course_card_images,public.v3_course_card_image_history from public,anon,authenticated;
grant select,insert,update,delete on public.v3_course_card_images to service_role;
grant select,insert on public.v3_course_card_image_history to service_role;
create function public.v3_course_card_image_save(p_actor uuid,p_course text,p_image uuid default null,p_shared text default null,p_alt text default null,p_reset boolean default false)
returns void language plpgsql security invoker set search_path='' as $$
declare previous jsonb; chosen jsonb;
begin
 if not coalesce(public.v2_is_platform_principal(p_actor),false) then raise exception 'Only APGI platform principals may change shared course artwork';end if;
 perform 1 from public.courses where id=p_course for update;
 if not found then raise exception 'Choose an available course';end if;
 select to_jsonb(c) into previous from public.v3_course_card_images c where course_id=p_course;
 if p_reset then
  if p_image is not null or p_shared is not null then raise exception 'Choose either a new image or restore the original';end if;
  delete from public.v3_course_card_images where course_id=p_course;
 else
  if (p_image is not null)::int + (p_shared is not null)::int <> 1 then raise exception 'Select one image from the library';end if;
  if coalesce(length(trim(p_alt)),0) not between 1 and 250 then raise exception 'Add a short description of the course image';end if;
  if p_image is not null and not exists(select 1 from public.v2_image_library i join storage.objects o on o.bucket_id='email-message-images' and o.name=i.object_path where i.id=p_image and i.purpose in ('course','both') and public.v2_message_admin(p_actor,i.organisation_id)) then raise exception 'Choose a course image from an authorised image library';end if;
  if p_shared is not null and p_shared !~ '^library:(welcome|progress|completion|feedback|announcements|reviews)-(photo-)?0[123]$' then raise exception 'Choose a shared library image';end if;
  insert into public.v3_course_card_images(course_id,image_id,shared_image,alt_text,updated_by) values(p_course,p_image,p_shared,trim(p_alt),p_actor)
  on conflict(course_id) do update set image_id=excluded.image_id,shared_image=excluded.shared_image,alt_text=excluded.alt_text,updated_by=excluded.updated_by,updated_at=now();
  select to_jsonb(c) into chosen from public.v3_course_card_images c where course_id=p_course;
 end if;
 if previous is distinct from chosen then insert into public.v3_course_card_image_history(course_id,actor_id,previous_image,selected_image) values(p_course,p_actor,previous,chosen);end if;
end $$;
revoke all on function public.v3_course_card_image_save(uuid,text,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.v3_course_card_image_save(uuid,text,uuid,text,text,boolean) to service_role;
