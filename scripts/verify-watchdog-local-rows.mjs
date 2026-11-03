import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
const root='C:/Users/Johan/Codex-Work/watchdog-payment-20261103',home=root+'/recovery-key-private',db='supabase_db_apgi-full-recovery-20261103-c';
const inspect=JSON.parse(execFileSync('docker',['inspect',db],{encoding:'utf8',windowsHide:true}))[0];
if(inspect.Name!=='/'+db||Object.values(inspect.HostConfig.PortBindings??{}).some(v=>v.some(b=>b.HostIp!=='127.0.0.1')))throw Error('Unapproved recovery database');
const dp="Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); [Console]::Write([Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)))";
const pass=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',dp],{input:(await readFile(home+'/passphrase.current-user.dpapi')).toString('base64'),encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']});
const decrypt=file=>execFileSync('C:/Program Files/Git/usr/bin/gpg.exe',['--homedir','/c/'+home.slice(3),'--batch','--yes','--pinentry-mode','loopback','--passphrase-fd','0','--decrypt',file.replace('C:/','/c/')],{input:pass+'\n',windowsHide:true,stdio:['pipe','pipe','pipe'],maxBuffer:64*1024*1024});
const snapshot=JSON.parse(await readFile(root+'/database-encrypted-snapshot.json','utf8')),schema=JSON.parse(decrypt(home+'/schema.pgp'));
const quote=s=>'"'+s.replaceAll('"','""')+'"',literal=s=>"'"+s.replaceAll("'","''")+"'";const checks=[];
for(const [i,t] of snapshot.tables.entries()){
 const plain=decrypt(home+'/verification-ciphertext/'+i+'.pgp'),cols=schema.columns.filter(c=>c.schema===t.schema&&c.table===t.table).map(c=>c.name);
 const value='jsonb_build_object('+cols.map(c=>literal(c)+',t.'+quote(c)).join(',')+')';
 const query=`with expected as (select e value from jsonb_array_elements((${literal(plain.toString('utf8'))}::jsonb)->'rows') e),actual as(select ${value} value from ${quote(t.schema)}.${quote(t.table)} t),e as(select count(*) n,encode(sha256(convert_to(coalesce(string_agg(encode(sha256(convert_to(value::text,'UTF8')),'hex'),'' order by encode(sha256(convert_to(value::text,'UTF8')),'hex')),''),'UTF8')),'hex') h from expected),a as(select count(*) n,encode(sha256(convert_to(coalesce(string_agg(encode(sha256(convert_to(value::text,'UTF8')),'hex'),'' order by encode(sha256(convert_to(value::text,'UTF8')),'hex')),''),'UTF8')),'hex') h from actual) select json_build_object('expected',e.n,'actual',a.n,'matched',e.h=a.h,'digest',a.h) from e,a;`;
 let data;try{data=JSON.parse(execFileSync('docker',['exec','-i',db,'psql','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input:query,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],maxBuffer:20000}));}catch{throw Error('Recovery row comparison unavailable for '+t.schema+'.'+t.table);}
 checks.push({schema:t.schema,table:t.table,...data});plain.fill(0);
}
const expectedChanged=new Set(['public.v2_watchdog_monitors','auth.schema_migrations','storage.migrations']);
const changed=checks.filter(c=>!c.matched),unexpected=changed.filter(c=>!expectedChanged.has(c.schema+'.'+c.table));
const receipt={version:1,finishedAt:new Date().toISOString(),target:db,matched:checks.length-changed.length,changed,unexpectedDifferences:unexpected.length,checks,notes:['Watchdog schedules are deliberately disabled in recovery.','Provider migration bookkeeping may advance when the isolated native Auth service starts.','Comparison uses PostgreSQL JSONB row hashes against the original decrypted snapshot, including duplicate row counts.']};
await writeFile(root+'/local-row-verification.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify({matched:receipt.matched,changed:changed.map(c=>c.schema+'.'+c.table),unexpectedDifferences:unexpected.length}));if(unexpected.length)process.exitCode=1;
