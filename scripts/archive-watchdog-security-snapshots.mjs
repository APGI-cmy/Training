// Bounded historical metadata snapshots, not continuous forensic log coverage.
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='C:/Users/Johan/Codex-Work/watchdog-payment-20261103',destination='C:/Users/Johan/OneDrive/Documents/ChatGPT/Training portal platform/Security backups/2026-11-03',home=root+'/recovery-key-private';
const fingerprint=JSON.parse(await readFile(root+'/recovery-key-receipt.json')).fingerprint;
const fields=['time','source','level','response_status','auth_status','storage_status','auth_action','audit_action','database_severity','sql_state'];
const provider=[];for(const name of ['supabase-log-metadata.json','supabase-log-metadata-page2.json','supabase-log-metadata-page3.json']){const a=JSON.parse(await readFile(root+'/'+name));for(const r of a.result)provider.push(Object.fromEntries(fields.map(f=>[f,r[f]??null])));}
if(provider.length!==2010)throw Error('Bounded provider snapshot count changed');
const requests=(await readFile(root+'/vercel-request-records-private.jsonl','utf8')).trim().split('\n').map(l=>JSON.parse(l)).filter(r=>r.type==='request').map(({data:r})=>({timestamp:r.timestamp,status:r.httpStatus,environment:r.environment,method:r.requestMethod,cacheResult:r.cacheResult,wafAction:r.wafAction}));
const record={version:1,createdAt:new Date().toISOString(),window:{from:'2026-11-03T07:00:00Z',to:'2026-11-03T08:15:00Z'},supabase:provider,vercel:requests,limitations:['Bounded provider metadata snapshots only; Vercel sample is capped at 100 request records.','Identities, addresses, request paths, user agents, query text, headers and message bodies are omitted.','Continuous external drains are prepared but not activated.']};
const bytes=Buffer.from(JSON.stringify(record));
const target=destination+'/security-log-metadata.pgp';
execFileSync('C:/Program Files/Git/usr/bin/gpg.exe',['--homedir','/c/'+home.slice(3),'--batch','--yes','--trust-model','always','--recipient',fingerprint,'--cipher-algo','AES256','--output',target.replace('C:/','/c/'),'--encrypt'],{input:bytes,windowsHide:true,stdio:['pipe','pipe','pipe']});
await copyFile(home+'/schema.pgp',destination+'/database-schema.pgp');
const grants={version:1,source:'eaaqgtdpvbxdgjxphjie',verifiedAt:new Date().toISOString(),applicationSupplement:['grant select (id,email,email_confirmed_at) on auth.users to service_role;','grant usage on schema watchdog_private to service_role;','grant usage on schema course_access_private to authenticated;'],localProvider:{totpEnroll:true,totpVerify:true},notes:['Apply after the encrypted schema restore. Native hosted provider roles/configuration require their own recovery procedure.']};
await writeFile(destination+'/recovery-access-supplement.json',JSON.stringify(grants,null,2));
const receipt={createdAt:new Date().toISOString(),supabaseEvents:provider.length,vercelRequestSample:requests.length,file:'security-log-metadata.pgp',ciphertextSha256:createHash('sha256').update(await readFile(target)).digest('hex'),plaintextSha256:createHash('sha256').update(bytes).digest('hex'),continuous:false};
await writeFile(destination+'/log-archive-receipt.json',JSON.stringify(receipt,null,2));await writeFile(root+'/log-archive-receipt.json',JSON.stringify(receipt,null,2));
console.log(JSON.stringify(receipt));
