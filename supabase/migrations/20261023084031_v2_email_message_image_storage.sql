-- Public email graphics are deliberately shareable; only the server uploads
-- after checking the administrator's company scope. No client write policy.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('email-message-images','email-message-images',true,2097152,array['image/jpeg']);
