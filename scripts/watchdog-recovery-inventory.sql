-- Read-only recovery inventory. Run with an authorised administrative connection
-- to the explicitly selected source or isolated recovery project. Returns counts
-- and SHA-256 digests, never table contents, password hashes, tokens or file bytes.
-- Table data is unordered; each canonical JSONB row is hashed and the sorted row
-- hashes are hashed again. Duplicate rows remain represented in the digest.
with tables as materialized (
 select n.nspname as schema_name,c.relname as table_name,c.oid,c.relrowsecurity,c.relforcerowsecurity
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname in ('public','auth','storage') and c.relkind='r'
), inventories as materialized (
 select t.*,query_to_xml(format(
  'select count(*) as rows, encode(sha256(convert_to(coalesce(string_agg(h, '''' order by h), ''''), ''UTF8'')), ''hex'') as digest from (select encode(sha256(convert_to(to_jsonb(t)::text, ''UTF8'')), ''hex'') as h from %I.%I t) s',schema_name,table_name),false,true,'') as x
 from tables t
)
select jsonb_build_object(
 'version',1,'capturedAt',clock_timestamp(),'databaseVersion',current_setting('server_version'),
 'tables',(select jsonb_agg(jsonb_build_object(
  'schema',schema_name,'table',table_name,'rows',((xpath('/row/rows/text()',x))[1]::text)::bigint,
  'digest',(xpath('/row/digest/text()',x))[1]::text,
  'rls',relrowsecurity,'forceRls',relforcerowsecurity,
  'columnsDigest',(select encode(sha256(convert_to(coalesce(string_agg(concat_ws('|',a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,a.attidentity,a.attgenerated),E'\n' order by a.attnum),''),'UTF8')),'hex') from pg_attribute a where a.attrelid=i.oid and a.attnum>0 and not a.attisdropped),
  'policiesDigest',(select encode(sha256(convert_to(coalesce(string_agg(concat_ws('|',p.polname,p.polcmd,p.polpermissive,(select string_agg(case when role_id=0 then 'PUBLIC' else (select rolname from pg_roles where oid=role_id) end,',' order by case when role_id=0 then 'PUBLIC' else (select rolname from pg_roles where oid=role_id) end) from unnest(p.polroles) role_id),pg_get_expr(p.polqual,p.polrelid),pg_get_expr(p.polwithcheck,p.polrelid)),E'\n' order by p.polname),''),'UTF8')),'hex') from pg_policy p where p.polrelid=i.oid),
  'constraintsDigest',(select encode(sha256(convert_to(coalesce(string_agg(concat_ws('|',co.conname,pg_get_constraintdef(co.oid)),E'\n' order by co.conname),''),'UTF8')),'hex') from pg_constraint co where co.conrelid=i.oid),
  'indexesDigest',(select encode(sha256(convert_to(coalesce(string_agg(pg_get_indexdef(ix.indexrelid),E'\n' order by pg_get_indexdef(ix.indexrelid)),''),'UTF8')),'hex') from pg_index ix where ix.indrelid=i.oid),
  'triggersDigest',(select encode(sha256(convert_to(coalesce(string_agg(concat_ws('|',tr.tgname,tr.tgenabled,pg_get_triggerdef(tr.oid)),E'\n' order by tr.tgname),''),'UTF8')),'hex') from pg_trigger tr where tr.tgrelid=i.oid and not tr.tgisinternal),
  'grantsDigest',(select encode(sha256(convert_to(coalesce(string_agg(concat_ws('|',grantor,grantee,privilege_type,is_grantable),E'\n' order by grantor,grantee,privilege_type,is_grantable),''),'UTF8')),'hex') from information_schema.table_privileges g where g.table_schema=i.schema_name and g.table_name=i.table_name)
 ) order by schema_name,table_name) from inventories i),
 'functionsDigest',(select encode(sha256(convert_to(coalesce(string_agg(concat_ws('|',n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),pg_get_functiondef(p.oid)),E'\n' order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)),''),'UTF8')),'hex') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private','course_access_private','watchdog_private') and p.prokind='f'),
 'extensions',(select jsonb_agg(jsonb_build_object('name',extname,'version',extversion) order by extname) from pg_extension),
 'storageObjectsExcludedFromDatabaseBackup',true
) as inventory;
