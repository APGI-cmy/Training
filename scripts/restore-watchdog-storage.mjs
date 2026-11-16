// Administrative recovery drill. No provider credential or plaintext object is
// written to disk. Only the explicitly approved separate target accepts writes.
import {createServer} from 'node:net';
import {createHash,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {loadEnvFile} from 'node:process';
const sourceRef='eaaqgtdpvbxdgjxphjie',targetRef='guoarsqxmjeqheqsnczg';
const origin=ref=>`https://${ref}.supabase.co`;
const qa=resolve('C:/Users/Johan/Codex-Work/watchdog-recovery-20261103');
const pipe=process.argv[2];
if(!/^\\\\\.\\pipe\\apgi-recovery-[a-f0-9-]{36}$/.test(pipe??''))throw Error('Approved local credential pipe required');
const digest=b=>createHash('sha256').update(b).digest('hex');
const encodePath=name=>name.split('/').map(encodeURIComponent).join('/');
function keyFor(key,ref,role){try{const claim=JSON.parse(Buffer.from(key.split('.')[1],'base64url'));return claim.ref===ref&&claim.role===role;}catch{return false;}}
async function credential(){
 return new Promise((done,fail)=>{
  const server=createServer(socket=>{let bytes=0,text='';socket.setTimeout(15000,()=>socket.destroy());socket.on('data',c=>{bytes+=c.length;if(bytes>16384){socket.destroy();return;}text+=c.toString('utf8');});socket.on('end',()=>{clearTimeout(timer);server.close();try{const value=JSON.parse(text);if(!keyFor(value.service,targetRef,'service_role')||!keyFor(value.anon,targetRef,'anon'))throw Error();done(value);}catch{fail(Error('Recovery credential identity rejected'));}});});
  const timer=setTimeout(()=>{server.close();fail(Error('Recovery credential handoff timed out'));},300000);
  server.on('error',()=>{clearTimeout(timer);fail(Error('Local credential channel unavailable'));});
  server.listen({path:pipe,readableAll:false,writableAll:false},()=>console.log(JSON.stringify({ready:true,credentialChannel:'Current Windows user local pipe; no credential file'})));
 });
}
async function call(ref,key,path,{method='GET',body,contentType='application/json',upsert}={}){
 if(![sourceRef,targetRef].includes(ref)||!path.startsWith('/storage/v1/')||path.includes('..')||method!=='GET'&&ref!==targetRef&& !path.startsWith('/storage/v1/object/list/'))throw Error('Recovery request rejected');
 const headers={apikey:key,authorization:'Bearer '+key,'content-type':contentType};if(upsert!==undefined)headers['x-upsert']=String(upsert);
 return fetch(origin(ref)+path,{method,headers,body,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});
}
async function jsonResponse(r){if(!r.ok)throw Error('Recovery provider request failed: '+r.status);return r.json();}
async function objects(ref,key,bucket){
 const queue=[''],files=[];let folders=0;
 while(queue.length){const prefix=queue.shift();if(++folders>100)throw Error('Unexpected storage inventory');
  for(let offset=0;;offset+=100){const page=await jsonResponse(await call(ref,key,'/storage/v1/object/list/'+encodeURIComponent(bucket),{method:'POST',body:JSON.stringify({prefix,limit:100,offset,sortBy:{column:'name',order:'asc'}})}));
   if(!Array.isArray(page))throw Error('Invalid storage inventory');
   for(const f of page){if(typeof f.name!=='string'||f.name.includes('..')||f.name.includes('\\'))throw Error('Invalid storage name');const name=prefix?prefix+'/'+f.name:f.name;if(f.id)files.push({bucket,name,id:f.id,metadata:f.metadata});else queue.push(name);}
   if(page.length<100)break;if(offset>1000)throw Error('Unexpected storage inventory size');
  }
 }
 return files.sort((a,b)=>a.name.localeCompare(b.name));
}
function dpapi(data,operation){
 const command="Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $p=[Security.Cryptography.ProtectedData]::"+operation+"($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Write([Convert]::ToBase64String($p))";
 return Buffer.from(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{input:data.toString('base64'),windowsHide:true,encoding:'utf8',timeout:15000}),'base64');
}
try{
 loadEnvFile('C:/Users/Johan/.codex/worktrees/training-platform-v2/.env.local');
 if(process.env.NEXT_PUBLIC_SUPABASE_URL!==origin(sourceRef)||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Source identity mismatch');
 const sourceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const keys=await credential();
 const start=new Date().toISOString(),folder=join(qa,'storage-backup-'+Date.now());await mkdir(folder,{recursive:false});
 const account=execFileSync('whoami',[],{encoding:'utf8',windowsHide:true}).trim();
 execFileSync('icacls.exe',[folder,'/inheritance:r','/grant:r',account+':(OI)(CI)F','SYSTEM:(OI)(CI)F'],{windowsHide:true,stdio:'pipe'});
 const encryptionKey=randomBytes(32),wrapped=dpapi(encryptionKey,'Protect');await writeFile(join(folder,'key.current-user.dpapi'),wrapped,{flag:'wx'});
 const sourceBuckets=await jsonResponse(await call(sourceRef,sourceKey,'/storage/v1/bucket'));
 const targetBuckets=await jsonResponse(await call(targetRef,keys.service,'/storage/v1/bucket'));
 if(sourceBuckets.length!==5||targetBuckets.length!==5)throw Error('Unexpected recovery bucket count');
 let inventory=[];
 for(const b of sourceBuckets){const target=targetBuckets.find(t=>t.id===b.id);if(!target||target.public!==b.public||target.file_size_limit!==b.file_size_limit||JSON.stringify(target.allowed_mime_types)!==JSON.stringify(b.allowed_mime_types))throw Error('Bucket protections do not match');inventory.push(...await objects(sourceRef,sourceKey,b.id));}
 if(inventory.length!==16)throw Error('Storage count changed; review inventory before proceeding');
 const receipts=[];let total=0;
 for(const [i,f] of inventory.entries()){
  const r=await call(sourceRef,sourceKey,'/storage/v1/object/authenticated/'+f.bucket+'/'+encodePath(f.name));if(!r.ok)throw Error('Source file unavailable: '+r.status);
  if(Number(r.headers.get('content-length'))>10485760)throw Error('Source object exceeds drill bound');
  const bytes=Buffer.from(await r.arrayBuffer());total+=bytes.length;if(bytes.length>10485760||total>104857600)throw Error('Storage snapshot exceeds drill bound');
  const plain=Buffer.from(JSON.stringify({bucket:f.bucket,name:f.name,mime:r.headers.get('content-type')??'application/octet-stream',data:bytes.toString('base64')}));
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey,iv),encrypted=Buffer.concat([cipher.update(plain),cipher.final()]);
  await writeFile(join(folder,String(i).padStart(3,'0')+'.aesgcm'),Buffer.concat([iv,cipher.getAuthTag(),encrypted]),{flag:'wx'});
  receipts.push({object:digest(f.bucket+'\0'+f.name),bytes:bytes.length,sha256:digest(bytes),private:sourceBuckets.find(b=>b.id===f.bucket).public===false,restored:false,hashVerified:false,anonymousDenied:null});
 }
 // Restore from the actual encrypted archive, not the still-live source bytes.
 const unwrapped=dpapi(await readFile(join(folder,'key.current-user.dpapi')),'Unprotect');
 for(const [i,receipt] of receipts.entries()){
  const encrypted=await readFile(join(folder,String(i).padStart(3,'0')+'.aesgcm')),decipher=createDecipheriv('aes-256-gcm',unwrapped,encrypted.subarray(0,12));decipher.setAuthTag(encrypted.subarray(12,28));
  const f=JSON.parse(Buffer.concat([decipher.update(encrypted.subarray(28)),decipher.final()]).toString('utf8')),bytes=Buffer.from(f.data,'base64');
  if(digest(bytes)!==receipt.sha256||digest(f.bucket+'\0'+f.name)!==receipt.object)throw Error('Encrypted backup integrity check failed');
  const path='/storage/v1/object/'+f.bucket+'/'+encodePath(f.name);
  const uploaded=await call(targetRef,keys.service,path,{method:'POST',body:bytes,contentType:f.mime,upsert:true});if(!uploaded.ok)throw Error('Recovery upload failed: '+uploaded.status);await uploaded.body?.cancel();receipt.restored=true;
  const checked=await call(targetRef,keys.service,'/storage/v1/object/authenticated/'+f.bucket+'/'+encodePath(f.name));
  receipt.hashVerified=checked.ok&&digest(Buffer.from(await checked.arrayBuffer()))===receipt.sha256;
  if(!receipt.hashVerified)throw Error('Restored file integrity check failed');
  if(receipt.private){const negative=await call(targetRef,keys.anon,'/storage/v1/object/authenticated/'+f.bucket+'/'+encodePath(f.name));receipt.anonymousDenied=[400,401,403,404].includes(negative.status);await negative.body?.cancel();if(!receipt.anonymousDenied)throw Error('Private recovery object exposed');}
 }
 let after=[];for(const b of sourceBuckets)after.push(...await objects(sourceRef,sourceKey,b.id));
 if(digest(JSON.stringify(after))!==digest(JSON.stringify(inventory)))throw Error('Source inventory changed during the snapshot');
 const receipt={version:1,source:sourceRef,target:targetRef,startedAt:start,finishedAt:new Date().toISOString(),archive:folder,encryption:'AES-256-GCM; key protected with Windows CurrentUser DPAPI',objects:receipts,totalBytes:total,complete:receipts.every(r=>r.restored&&r.hashVerified&&(!r.private||r.anonymousDenied)),limitations:['File snapshot was captured now, separately from the older database backup. Historical Storage bytes were not present in that database backup.','The encryption key is recoverable by this Windows account; off-machine key escrow and off-site archive retention remain separate tasks.','Anonymous private-file denials are paired with service read controls; all company/user application download paths require additional checks.']};
 const receiptBytes=JSON.stringify(receipt,null,2);
 await writeFile(join(folder,'storage-restore-receipt.json'),receiptBytes,{flag:'wx'});
 try{await writeFile(join(qa,'storage-restore-receipt.json'),receiptBytes,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}
 await writeFile(join(folder,'README.txt'),'APGI V2 encrypted Storage snapshot. '+start+'\nEach .aesgcm file is IV(12 bytes), authentication tag(16 bytes), ciphertext(JSON).\nKey is protected by Windows CurrentUser DPAPI. Keep this folder private; do not put its files in a public repository.\nProvider credentials are not included.\n');
 encryptionKey.fill(0);unwrapped.fill(0);
 console.log(JSON.stringify({complete:receipt.complete,objects:receipts.length,privateObjects:receipts.filter(r=>r.private).length,totalBytes:total,archive:folder,receipt:join(qa,'storage-restore-receipt.json')}));
}catch(error){console.error(JSON.stringify({complete:false,error:error instanceof Error&&/^(Recovery |Source |Storage |Bucket |Unexpected |Invalid |Encrypted |Restored |Private |Approved |Local )/.test(error.message)?error.message:'Recovery operation could not complete. No secret or customer response body is logged.'}));process.exitCode=1;}
