import http from 'node:http';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {mkdir,readFile,statfs} from 'node:fs/promises';
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
export {archiveManifest,readArchive,persistBatch} from './archive-store.mjs';
import {archiveManifest,readArchive,persistBatch,database,storageProbe,assessCapacity} from './archive-store.mjs';
async function main(){
 const root=process.env.ARCHIVE_DIRECTORY??'/var/data/apgi-security-logs',fingerprint=process.env.ARCHIVE_KEY_FINGERPRINT;
 if(!/^[A-F0-9]{40}$/.test(fingerprint??'')||['SUPABASE_DRAIN_TOKEN','VERCEL_DRAIN_TOKEN','VERCEL_SIGNATURE_SECRET','ARCHIVE_READ_TOKEN'].some(k=>(process.env[k]?.length??0)<32))throw Error('ARCHIVE_CONFIGURATION_REQUIRED');
 const gpgHome='/tmp/apgi-archive-public-key';await mkdir(gpgHome,{recursive:true});
 const gpg=(args,input)=>new Promise((resolve,reject)=>{const child=spawn('gpg',['--homedir',gpgHome,'--batch','--yes',...args],{stdio:['pipe','pipe','pipe']});const timeout=setTimeout(()=>child.kill('SIGKILL'),10000);const chunks=[];let size=0;child.stdout.on('data',b=>{size+=b.length;if(size>8*1024*1024)child.kill();else chunks.push(b);});child.stderr.resume();child.on('error',()=>reject(Error('ENCRYPTION_UNAVAILABLE')));child.on('close',code=>{clearTimeout(timeout);code===0?resolve(Buffer.concat(chunks)):reject(Error('ENCRYPTION_FAILED'));});child.stdin.on('error',()=>{});child.stdin.end(input);});
 await gpg(['--import'],await readFile('recovery-public-key.asc'));
 const keys=(await gpg(['--with-colons','--list-keys'],null)).toString();if(!keys.includes('fpr:::::::::'+fingerprint+':'))throw Error('ARCHIVE_KEY_MISMATCH');
 const encrypt=bytes=>gpg(['--trust-model','always','--recipient',fingerprint,'--cipher-algo','AES256','--compress-algo','zip','--encrypt'],bytes);
 const queue=createArchiveQueue();let receiving=0;
 const failures={vercel:null,supabase:null};
 let probe={status:'unavailable',probe:'starting',checkedAt:null};
 const runProbe=async()=>{try{probe=await queue.run(()=>storageProbe(root,encrypt));}catch{probe={status:'unavailable',probe:'encrypted_write_failed',checkedAt:new Date().toISOString()};console.error(JSON.stringify({event:'archive_health',status:'unavailable',reason:'encrypted_write_failed'}));}};
 await database(root);await runProbe();
 const monitor=setInterval(()=>{void runProbe();},60000);monitor.unref();

 const server=http.createServer(async(req,res)=>{
  const finish=(status,value)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value));};
  if(req.method==='GET'&&req.url==='/health'){
   try{
    const capacity=assessCapacity(await statfs(root));
    const stale=!probe.checkedAt||Date.now()-Date.parse(probe.checkedAt)>180000;
    const db=await database(root),test=db.prepare("SELECT value FROM archive_state WHERE key='monitor_test_until'").get();
    const testActive=test&&Date.parse(test.value)>Date.now();
    const status=capacity.status==='unavailable'||probe.status==='unavailable'||stale?'unavailable':capacity.status==='attention'||Object.values(failures).some(Boolean)||testActive?'attention':'ready';
    return finish(status==='unavailable'?503:200,{status,version:2,storage:'sqlite-encrypted-batches',...capacity,status,probe:probe.probe,checkedAt:probe.checkedAt,monitorTest:testActive?true:undefined,deliveryFailures:failures});
   }catch{return finish(503,{status:'unavailable'});}
  }
  if(req.method==='POST'&&req.url==='/admin/monitor-test'){
   if(!allowedToken(req.headers.authorization,'Bearer '+process.env.ARCHIVE_READ_TOKEN))return finish(401,{error:'Unauthorised'});
   // Bounded warning-only drill. It never changes ingestion, encryption or data.
   const until=new Date(Date.now()+120000).toISOString(),db=await database(root);
   db.prepare('INSERT OR REPLACE INTO archive_state VALUES (?,?)').run('monitor_test_until',until);
   return finish(200,{warningDrillUntil:until});
  }
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
   const records=decodeBody(bytes,req.headers['content-encoding']);await queue.run(()=>persistBatch({root,provider,records,encrypt}));failures[provider]=null;finish(200,{stored:true,events:records.length});
  }catch(e){
    const safeCodes=new Set(['BATCH_TOO_LARGE','INVALID_ENCODING','INVALID_BATCH','INVALID_EVENT','ENCRYPTION_FAILED','ENCRYPTION_UNAVAILABLE','ARCHIVE_CAPACITY_LOW','ARCHIVE_QUEUE_FULL','ARCHIVE_INTEGRITY_FAILED']);
    const reason=safeCodes.has(e.message)?e.message:['ENOSPC','EROFS','EACCES'].includes(e.code)?e.code:'ARCHIVE_WRITE_FAILED';
    failures[provider]={reason,at:new Date().toISOString()};
    console.error(JSON.stringify({event:'archive_delivery_failed',provider,reason}));
    finish(503,{error:'Archive did not confirm persistence; retry delivery'});
   }finally{receiving--;}
 });server.requestTimeout=20000;server.headersTimeout=10000;server.listen(Number(process.env.PORT??10000),'0.0.0.0');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('Security archive startup failed; no payload or credential is logged.');process.exitCode=1;});
