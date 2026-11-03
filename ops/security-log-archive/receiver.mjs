import http from 'node:http';
import {createHash,timingSafeEqual} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {mkdir,readFile,writeFile,rename,open,statfs,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
export function allowedToken(actual,expected){const a=Buffer.from(actual??''),e=Buffer.from(expected??'');return e.length>=32&&a.length===e.length&&timingSafeEqual(a,e);}
const short=v=>typeof v==='string'&&/^[A-Za-z0-9_.:/ -]{1,100}$/.test(v)?v:undefined;
export function minimise(records){
 if(!Array.isArray(records)||records.length>250)throw Error('INVALID_BATCH');
 return records.map(r=>{if(!r||typeof r!=='object')throw Error('INVALID_EVENT');const a=r.log_attributes??r.metadata??{},status=r.statusCode??r.status??a['response.status_code']??a['res.statusCode']??a.status;
  return {time:typeof r.timestamp==='number'||typeof r.timestamp==='string'&&/^[0-9TZ: .+-]{1,40}$/.test(r.timestamp)?r.timestamp:null,
   source:short(r.source)??'provider',level:short(r.level??a.level??a['parsed.error_severity'])??null,
   status:/^[1-5][0-9]{2}$/.test(String(status))?Number(status):null,
   action:short(a['auth_event.action']??a['auth_audit_event.action'])??null,
   sqlState:/^[A-Z0-9]{5}$/.test(a['parsed.sql_state_code']??'')?a['parsed.sql_state_code']:null};});
}
export function decodeBody(bytes,encoding){if(bytes.length>2*1024*1024)throw Error('BATCH_TOO_LARGE');const plain=encoding==='gzip'?gunzipSync(bytes,{maxOutputLength:4*1024*1024}):encoding?(()=>{throw Error('INVALID_ENCODING');})():bytes;if(plain.length>4*1024*1024)throw Error('BATCH_TOO_LARGE');return minimise(JSON.parse(plain));}
export async function persistBatch({root,provider,records,encrypt,now=new Date()}){
 if(!['supabase','vercel'].includes(provider))throw Error('INVALID_PROVIDER');
 const payload=Buffer.from(JSON.stringify({version:1,provider,receivedAt:now.toISOString(),redaction:'Allowlisted security metadata only; identities, addresses, paths, queries, headers and message bodies are omitted.',records}));
 const directory=join(root,now.toISOString().slice(0,10),provider);await mkdir(directory,{recursive:true});
 const available=await statfs(root);if(Number(available.bavail)*Number(available.bsize)<64*1024*1024)throw Error('ARCHIVE_SPACE_LOW');
 const digest=createHash('sha256').update(JSON.stringify(records)).digest('hex'),file=join(directory,digest+'.pgp');
 let existing=false;try{existing=(await stat(file)).size>0;}catch(e){if(e.code!=='ENOENT')throw e;}
 if(existing){const receipt=JSON.parse(await readFile(file+'.receipt.json','utf8')),cipher=await readFile(file);if(receipt.file!==digest+'.pgp'||receipt.events!==records.length||receipt.ciphertextSha256!==createHash('sha256').update(cipher).digest('hex'))throw Error('ARCHIVE_INTEGRITY_FAILED');return {duplicate:true,events:records.length};}
 const encrypted=await encrypt(payload);if(!Buffer.isBuffer(encrypted)||!encrypted.length)throw Error('ENCRYPTION_FAILED');
 const tmp=file+'.tmp';await writeFile(tmp,encrypted,{flag:'wx'});const handle=await open(tmp,'r+');try{await handle.sync();}finally{await handle.close();}await rename(tmp,file);
 const receipt={version:1,provider,receivedAt:now.toISOString(),events:records.length,file:digest+'.pgp',ciphertextSha256:createHash('sha256').update(encrypted).digest('hex')};
 await writeFile(file+'.receipt.json',JSON.stringify(receipt)+'\n',{flag:'wx'});return {duplicate:false,events:records.length};
}
async function main(){
 const root=process.env.ARCHIVE_DIRECTORY??'/var/data/apgi-security-logs',fingerprint=process.env.ARCHIVE_KEY_FINGERPRINT;
 if(!/^[A-F0-9]{40}$/.test(fingerprint??'')||!process.env.SUPABASE_DRAIN_TOKEN||!process.env.VERCEL_DRAIN_TOKEN)throw Error('ARCHIVE_CONFIGURATION_REQUIRED');
 const gpgHome='/tmp/apgi-archive-public-key';await mkdir(gpgHome,{recursive:true});
 const gpg=(args,input)=>new Promise((resolve,reject)=>{const child=spawn('gpg',['--homedir',gpgHome,'--batch','--yes',...args],{stdio:['pipe','pipe','pipe']});const chunks=[];let size=0;child.stdout.on('data',b=>{size+=b.length;if(size>8*1024*1024)child.kill();else chunks.push(b);});child.stderr.resume();child.on('error',()=>reject(Error('ENCRYPTION_UNAVAILABLE')));child.on('close',code=>code===0?resolve(Buffer.concat(chunks)):reject(Error('ENCRYPTION_FAILED')));child.stdin.end(input);});
 await gpg(['--import'],await readFile('recovery-public-key.asc'));
 const keys=(await gpg(['--with-colons','--list-keys'],null)).toString();if(!keys.includes('fpr:::::::::'+fingerprint+':'))throw Error('ARCHIVE_KEY_MISMATCH');
 const encrypt=bytes=>gpg(['--trust-model','always','--recipient',fingerprint,'--cipher-algo','AES256','--compress-algo','zip','--encrypt'],bytes);
 let busy=false;
 const server=http.createServer(async(req,res)=>{
  const finish=(status,value)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value));};
  if(req.method==='GET'&&req.url==='/health'){try{await mkdir(root,{recursive:true});const s=await statfs(root);return finish(Number(s.bavail)*Number(s.bsize)>=64*1024*1024?200:503,{status:Number(s.bavail)*Number(s.bsize)>=64*1024*1024?'ready':'attention'});}catch{return finish(503,{status:'unavailable'});}}
  const provider=req.url==='/ingest/supabase'?'supabase':req.url==='/ingest/vercel'?'vercel':null;
  if(req.method!=='POST'||!provider)return finish(404,{error:'Unavailable'});
  if(!allowedToken(req.headers.authorization,'Bearer '+process.env[provider==='supabase'?'SUPABASE_DRAIN_TOKEN':'VERCEL_DRAIN_TOKEN']))return finish(401,{error:'Unauthorised'});
  if(busy)return finish(503,{error:'Retry later'});busy=true;
  try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2*1024*1024)throw Error('BATCH_TOO_LARGE');chunks.push(chunk);}
   const records=decodeBody(Buffer.concat(chunks),req.headers['content-encoding']);await persistBatch({root,provider,records,encrypt});finish(200,{stored:true,events:records.length});
  }catch{finish(503,{error:'Archive did not confirm persistence; retry delivery'});}finally{busy=false;}
 });server.requestTimeout=20000;server.headersTimeout=10000;server.listen(Number(process.env.PORT??10000),'0.0.0.0');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('Security archive startup failed; no payload or credential is logged.');process.exitCode=1;});
