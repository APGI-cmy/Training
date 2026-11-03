// Full logical recovery into a named, loopback-only disposable Docker database.
// Real backup plaintext exists only in process memory / the isolated database;
// commands and customer rows are never printed or written as SQL files.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='C:/Users/Johan/Codex-Work/watchdog-payment-20261103',home=root+'/recovery-key-private';
const container='supabase_db_apgi-full-recovery-20261103-c',gpg='C:/Program Files/Git/usr/bin/gpg.exe';
const inspected=JSON.parse(execFileSync('docker',['inspect',container],{encoding:'utf8',windowsHide:true}))[0];
if(inspected.Name!=='/'+container||Object.values(inspected.HostConfig.PortBindings??{}).some(v=>v.some(b=>b.HostIp!=='127.0.0.1')))throw Error('Recovery database is not isolated on loopback');
const dp="Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); [Console]::Write([Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)))";
const pass=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',dp],{input:(await readFile(home+'/passphrase.current-user.dpapi')).toString('base64'),encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']});
const decrypt=file=>execFileSync(gpg,['--homedir','/c/'+home.slice(3),'--batch','--yes','--pinentry-mode','loopback','--passphrase-fd','0','--decrypt',file.replace('C:/','/c/')],{input:pass+'\n',windowsHide:true,stdio:['pipe','pipe','pipe'],maxBuffer:64*1024*1024});
let stage='schema',current='';
function sql(query,allowFailure=false){try{return execFileSync('docker',['exec','-i',container,'psql','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input:'\\set VERBOSITY terse\n'+query,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],maxBuffer:64*1024*1024});}catch(e){if(allowFailure)return null;const first=String(e.stderr??'').split('\n').find(l=>l.includes('ERROR:'))??'Database operation failed';throw Error(stage+' '+current+': '+first.slice(0,180));}}
const quote=s=>'"'+s.replaceAll('"','""')+'"',literal=s=>"'"+s.replaceAll("'","''")+"'";
try{
 const source=JSON.parse(await readFile(root+'/database-encrypted-snapshot.json','utf8'));
 await writeFile(home+'/schema.pgp',Buffer.from(await readFile(root+'/database-schema-encrypted.base64','utf8'),'base64'));
 const schema=JSON.parse(decrypt(home+'/schema.pgp'));
 if(source.project!=='eaaqgtdpvbxdgjxphjie'||source.tables.length!==135||schema.tables.length!==100)throw Error('Recovery archive identity mismatch');
 // This is the explicitly named disposable local drill database. A rerun starts
 // from its empty application schema; neither cloud database is ever a target.
 sql('drop schema public cascade; create schema public authorization postgres; grant usage on schema public to postgres,anon,authenticated,service_role;');
 sql('set role postgres;set search_path=public,extensions;'+schema.schemas.map(s=>'create schema if not exists '+quote(s)+';').join('')+(schema.enums??[]).join(';')+';'+(schema.sequences??[]).join(';')+';'+schema.tables.map(t=>t.ddl).join(';')+';');
 stage='functions';let pending=schema.functions??[];
 for(let attempt=0;attempt<5&&pending.length;attempt++){
  const failed=[];for(const f of pending)if(sql('set role postgres;set search_path=public,extensions;'+f+';',true)===null)failed.push(f);
  if(failed.length===pending.length)throw Error('Function dependency recovery needs review: '+failed.length);pending=failed;
 }if(pending.length)throw Error('Unrestored functions remain');
 stage='constraints';sql((schema.constraints??[]).join(';')+';'+(schema.indexes??[]).join(';')+';');
 stage='data';const restored=[];
 sql('begin;set local session_replication_role=replica;truncate '+source.tables.map(t=>quote(t.schema)+'.'+quote(t.table)).join(',')+' cascade;commit;');
 for(const [i,t] of source.tables.entries()){
  current=t.schema+'.'+t.table;
  const cipher=home+'/verification-ciphertext/'+i+'.pgp',plain=decrypt(cipher),record=JSON.parse(plain);
  if(record.schema!==t.schema||record.table!==t.table||record.rows.length!==t.rows)throw Error('Encrypted table identity mismatch');
  const columns=schema.columns.filter(c=>c.schema===t.schema&&c.table===t.table&&c.generated==='').map(c=>c.name);
  const available=JSON.parse(sql(`select coalesce(json_agg(attname),'[]') from pg_attribute where attrelid=to_regclass(${literal(current)}) and attnum>0 and not attisdropped`).trim());
  if(columns.some(c=>!available.includes(c)))throw Error('Restored provider table columns differ; no silent data omission is allowed');
  const names=columns.map(quote).join(','),table=quote(t.schema)+'.'+quote(t.table);
  sql('begin;set local session_replication_role=replica;'+(record.rows.length?'insert into '+table+' ('+names+') overriding system value select '+names+' from jsonb_populate_recordset(null::'+table+','+literal(JSON.stringify(record.rows))+'::jsonb);':'')+'commit;');
  restored.push({schema:t.schema,table:t.table,rows:t.rows,plaintextSha256:createHash('sha256').update(plain).digest('hex')});plain.fill(0);
 }
 current='';stage='access controls';
 sql(schema.tables.map(t=>'revoke all on table '+t.name+' from public,anon,authenticated,service_role;').join('')+(schema.tableGrants??[]).join(';')+';'+(schema.rls??[]).join('')+(schema.policies??[]).join(';')+';'+(schema.functionGrants??[]).join('')+(schema.triggers??[]).join(';')+';');
 // Keep schedules and every external integration disconnected in this copy.
 sql('grant select (id,email,email_confirmed_at) on auth.users to service_role;grant usage on schema watchdog_private to service_role;grant usage on schema course_access_private to authenticated;');
 sql("update public.v2_watchdog_monitors set enabled=false; notify pgrst,'reload schema';");
 const counts=JSON.parse(sql("select json_build_object('users',(select count(*) from auth.users),'companies',(select count(*) from public.organisations),'reviewRounds',(select count(*) from public.course_review_rounds),'files',(select count(*) from storage.objects))").trim());
 const receipt={version:1,finishedAt:new Date().toISOString(),sourceCapturedAt:source.capturedAt,target:container,loopbackOnly:true,tablesRestored:restored.length,tableChecks:restored,counts,outboundIntegrationsEnabled:false,limitations:['Local provider versions and configuration differ from hosted Supabase.','This tests the application with synthetic accounts; no real user password or authenticator is exercised.','A full application cutover and restored service restart still need their own runtime checks.']};
 await writeFile(root+'/local-database-recovery-receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify({complete:true,tablesRestored:restored.length,counts,loopbackOnly:true}));
}catch(e){console.error(JSON.stringify({complete:false,stage,table:current,error:e.message}));process.exitCode=1;}
