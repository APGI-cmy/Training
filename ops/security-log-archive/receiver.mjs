import http from 'node:http';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {mkdir,readFile,rename,open,statfs,stat,readdir,lstat,realpath} from 'node:fs/promises';
import {join,sep} from 'node:path';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
export function allowedToken(actual,expected){const a=Buffer.from(actual??''),e=Buffer.from(expected??'');return e.length>=32&&a.length===e.length&&timingSafeEqual(a,e);}
export function createArchiveQueue(limit=16){let pending=0,tail=Promise.resolve();return{run(task){if(pending>=limit)return Promise.reject(Error('ARCHIVE_QUEUE_FULL'));pending++;const job=tail.then(task);tail=job.catch(()=>{});return job.finally(()=>{pending--;});}};}
const sources=new Set(['provider','auth_logs','auth_audit_logs','postgres_logs','storage_logs','edge_logs','edge_function_logs','function_edge_logs','realtime_logs','pgbouncer_logs','pooler_logs','postgrest_logs','supavisor_logs','build','edge','lambda','static','firewall','external','redirect']);
const levels=new Set(['info','warn','warning','error','fatal','debug','trace','notice','panic','alert','critical','emergency','log']);
const actions=new Set(['login','logout','token_refreshed','token_revoked','user_signedup','user_recovery_requested','user_updated','user_deleted','user_invited','user_reauthenticated','mfa_factor_enrolled','mfa_factor_unenrolled','mfa_challenge_verified']);
export function validVercelSignature(bytes,actual,secret){if(typeof actual!=='string'||!/^[a-f0-9]{40}$/i.test(actual)||typeof secret!=='string'||secret.length<32)return false;return timingSafeEqual(Buffer.from(actual,'hex'),createHmac('sha1',secret).update(bytes).digest());}
export function minimise(records){
 if(!Array.isArray(records)||records.length>5000)throw Error('INVALID_BATCH');
 return records.map(r=>{if(!r||typeof r!=='object')throw Error('INVALID_EVENT');const a=r.log_attributes??(Array.isArray(r.metadata)?r.metadata[0]:r.metadata)??{},status=r.statusCode??r.status??a['response.status_code']??a['res.statusCode']??a.status;
  return {time:typeof r.timestamp==='number'||typeof r.timestamp==='string'&&/^[0-9TZ: .+-]{1,40}$/.test(r.timestamp)?r.timestamp:null,
   source:sources.has(r.source)?r.source:'provider',level:levels.has(r.level??a.level??a['parsed.error_severity'])?(r.level??a.level??a['parsed.error_severity']):null,
   status:/^[1-5][0-9]{2}$/.test(String(status))?Number(status):null,
   action:actions.has(a['auth_event.action']??a['auth_audit_event.action'])?(a['auth_event.action']??a['auth_audit_event.action']):null,
   sqlState:/^[A-Z0-9]{5}$/.test(a['parsed.sql_state_code']??'')?a['parsed.sql_state_code']:null};});
}
export function decodeBody(bytes,encoding){if(bytes.length>2*1024*1024)throw Error('BATCH_TOO_LARGE');const plain=encoding==='gzip'?gunzipSync(bytes,{maxOutputLength:4*1024*1024}):encoding?(()=>{throw Error('INVALID_ENCODING');})():bytes;if(plain.length>4*1024*1024)throw Error('BATCH_TOO_LARGE');return minimise(JSON.parse(plain));}
async function durableFile(file,bytes){const handle=await open(file,'wx');try{await handle.writeFile(bytes);await handle.sync();}finally{await handle.close();}}
export async function archiveManifest(root,date,provider,cursor=0){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!['supabase','vercel'].includes(provider)||!Number.isInteger(cursor)||cursor<0||cursor>1000000)throw Error('INVALID_ARCHIVE_SCOPE');
 const directory=join(root,date,provider);let files;try{files=(await readdir(directory)).filter(f=>/^[a-f0-9]{64}\.pgp\.receipt\.json$/.test(f)).sort();}catch(e){if(e.code==='ENOENT')return{receipts:[],next:null};throw e;}
 const receipts=[];for(const f of files.slice(cursor,cursor+250)){const r=JSON.parse(await readFile(join(directory,f),'utf8'));if(!/^[a-f0-9]{64}\.pgp$/.test(r.file??'')||!/^[a-f0-9]{64}$/.test(r.ciphertextSha256??''))throw Error('INVALID_RECEIPT');receipts.push(r);}
 return{receipts,next:cursor+250<files.length?cursor+250:null};
}
export async function readArchive(root,date,provider,file){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!['supabase','vercel'].includes(provider)||!/^[a-f0-9]{64}\.pgp$/.test(file))throw Error('INVALID_ARCHIVE_SCOPE');
 const path=join(root,date,provider,file),info=await lstat(path);if(!info.isFile()||info.isSymbolicLink()||info.size>8*1024*1024||!(await realpath(path)).startsWith((await realpath(root))+sep))throw Error('INVALID_ARCHIVE_FILE');
 const bytes=await readFile(path),receipt=JSON.parse(await readFile(path+'.receipt.json','utf8'));if(receipt.file!==file||receipt.ciphertextSha256!==createHash('sha256').update(bytes).digest('hex'))throw Error('ARCHIVE_INTEGRITY_FAILED');return bytes;
}
export async function persistBatch({root,provider,records,encrypt,now=new Date()}){
 if(!['supabase','vercel'].includes(provider))throw Error('INVALID_PROVIDER');
 const payload=Buffer.from(JSON.stringify({version:1,provider,receivedAt:now.toISOString(),redaction:'Allowlisted security metadata only; identities, addresses, paths, queries, headers and message bodies are omitted.',records}));
 const directory=join(root,now.toISOString().slice(0,10),provider);await mkdir(directory,{recursive:true});
 const available=await statfs(root);if(Number(available.bavail)*Number(available.bsize)<64*1024*1024)throw Error('ARCHIVE_SPACE_LOW');
 const digest=createHash('sha256').update(JSON.stringify(records)).digest('hex'),file=join(directory,digest+'.pgp');
 let existing=false;try{existing=(await stat(file)).size>0;}catch(e){if(e.code!=='ENOENT')throw e;}
 if(existing){const receipt=JSON.parse(await readFile(file+'.receipt.json','utf8')),cipher=await readFile(file);if(receipt.file!==digest+'.pgp'||receipt.events!==records.length||receipt.ciphertextSha256!==createHash('sha256').update(cipher).digest('hex'))throw Error('ARCHIVE_INTEGRITY_FAILED');return {duplicate:true,events:records.length};}
 const encrypted=await encrypt(payload);if(!Buffer.isBuffer(encrypted)||!encrypted.length)throw Error('ENCRYPTION_FAILED');
 const tmp=file+'.tmp';await durableFile(tmp,encrypted);await rename(tmp,file);
 const receipt={version:1,provider,receivedAt:now.toISOString(),events:records.length,file:digest+'.pgp',ciphertextSha256:createHash('sha256').update(encrypted).digest('hex')};
 await durableFile(file+'.receipt.json',JSON.stringify(receipt)+'\n');if(process.platform!=='win32'){const dir=await open(directory,'r');try{await dir.sync();}finally{await dir.close();}}return {duplicate:false,events:records.length};
}
async function main(){
 const root=process.env.ARCHIVE_DIRECTORY??'/var/data/apgi-security-logs',fingerprint=process.env.ARCHIVE_KEY_FINGERPRINT;
 if(!/^[A-F0-9]{40}$/.test(fingerprint??'')||['SUPABASE_DRAIN_TOKEN','VERCEL_DRAIN_TOKEN','VERCEL_SIGNATURE_SECRET','ARCHIVE_READ_TOKEN'].some(k=>(process.env[k]?.length??0)<32))throw Error('ARCHIVE_CONFIGURATION_REQUIRED');
 const gpgHome='/tmp/apgi-archive-public-key';await mkdir(gpgHome,{recursive:true});
 const gpg=(args,input)=>new Promise((resolve,reject)=>{const child=spawn('gpg',['--homedir',gpgHome,'--batch','--yes',...args],{stdio:['pipe','pipe','pipe']});const chunks=[];let size=0;child.stdout.on('data',b=>{size+=b.length;if(size>8*1024*1024)child.kill();else chunks.push(b);});child.stderr.resume();child.on('error',()=>reject(Error('ENCRYPTION_UNAVAILABLE')));child.on('close',code=>code===0?resolve(Buffer.concat(chunks)):reject(Error('ENCRYPTION_FAILED')));child.stdin.end(input);});
 await gpg(['--import'],await readFile('recovery-public-key.asc'));
 const keys=(await gpg(['--with-colons','--list-keys'],null)).toString();if(!keys.includes('fpr:::::::::'+fingerprint+':'))throw Error('ARCHIVE_KEY_MISMATCH');
 const encrypt=bytes=>gpg(['--trust-model','always','--recipient',fingerprint,'--cipher-algo','AES256','--compress-algo','zip','--encrypt'],bytes);
 const queue=createArchiveQueue();let receiving=0;
 const server=http.createServer(async(req,res)=>{
  const finish=(status,value)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value));};
  if(req.method==='GET'&&req.url==='/health'){try{await mkdir(root,{recursive:true});const s=await statfs(root);return finish(Number(s.bavail)*Number(s.bsize)>=64*1024*1024?200:503,{status:Number(s.bavail)*Number(s.bsize)>=64*1024*1024?'ready':'attention'});}catch{return finish(503,{status:'unavailable'});}}
  if(req.method==='GET'&&req.url?.startsWith('/admin/')){
   if(!allowedToken(req.headers.authorization,'Bearer '+process.env.ARCHIVE_READ_TOKEN))return finish(401,{error:'Unauthorised'});
   try{const u=new URL(req.url,'http://receiver.invalid');
    if(u.pathname==='/admin/manifest')return finish(200,await archiveManifest(root,u.searchParams.get('date')??'',u.searchParams.get('provider')??'',Number(u.searchParams.get('cursor')??0)));
    const m=u.pathname.match(/^\/admin\/file\/(\d{4}-\d{2}-\d{2})\/(supabase|vercel)\/([a-f0-9]{64}\.pgp)$/);if(m){const bytes=await readArchive(root,m[1],m[2],m[3]);res.writeHead(200,{'content-type':'application/pgp-encrypted','cache-control':'private, no-store','x-content-type-options':'nosniff'});return res.end(bytes);}
    return finish(404,{error:'Unavailable'});
   }catch{return finish(404,{error:'Archive unavailable or integrity verification failed'});}
  }
  const provider=req.url==='/ingest/supabase'?'supabase':req.url==='/ingest/vercel'?'vercel':null;
  if(req.method!=='POST'||!provider)return finish(404,{error:'Unavailable'});
  if(!allowedToken(req.headers.authorization,'Bearer '+process.env[provider==='supabase'?'SUPABASE_DRAIN_TOKEN':'VERCEL_DRAIN_TOKEN']))return finish(401,{error:'Unauthorised'});
  if(receiving>=16)return finish(503,{error:'Retry later'});receiving++;
  try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2*1024*1024)throw Error('BATCH_TOO_LARGE');chunks.push(chunk);}
   const bytes=Buffer.concat(chunks);if(provider==='vercel'&&!validVercelSignature(bytes,req.headers['x-vercel-signature'],process.env.VERCEL_SIGNATURE_SECRET))return finish(403,{error:'Signature verification failed'});
   const records=decodeBody(bytes,req.headers['content-encoding']);await queue.run(()=>persistBatch({root,provider,records,encrypt}));finish(200,{stored:true,events:records.length});
  }catch{finish(503,{error:'Archive did not confirm persistence; retry delivery'});}finally{receiving--;}
 });server.requestTimeout=20000;server.headersTimeout=10000;server.listen(Number(process.env.PORT??10000),'0.0.0.0');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('Security archive startup failed; no payload or credential is logged.');process.exitCode=1;});
