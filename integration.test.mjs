import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {writeFile,readFile,unlink} from 'node:fs/promises';
import {randomBytes,createHmac,createHash} from 'node:crypto';
const image='apgi-archive-repair:20261116',container='apgi-archive-repair-test-20261116',volume='apgi-archive-repair-test-20261116';
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true});
const key=docker('run','--rm','--entrypoint','sh',image,'-c','mkdir /tmp/test-key; gpg --homedir /tmp/test-key --with-colons --show-keys /app/recovery-public-key.asc');
const fingerprint=key.split('\n').find(l=>l.startsWith('fpr:')).split(':')[9];
const env={ARCHIVE_KEY_FINGERPRINT:fingerprint,...Object.fromEntries(['SUPABASE_DRAIN_TOKEN','VERCEL_DRAIN_TOKEN','VERCEL_SIGNATURE_SECRET','ARCHIVE_READ_TOKEN'].map(k=>[k,randomBytes(32).toString('hex')]))};
const envFile=new URL('../integration.env',import.meta.url);
await writeFile(envFile,Object.entries(env).map(([k,v])=>k+'='+v).join('\n'));
const origin='http://127.0.0.1:52731',headers={authorization:'Bearer '+env.ARCHIVE_READ_TOKEN};
const digest=b=>createHash('sha256').update(b).digest('hex');
async function ready(){for(let i=0;i<30;i++){try{const r=await fetch(origin+'/health');const j=await r.json();if(r.status===200&&j.status==='ready')return j;}catch{}await new Promise(r=>setTimeout(r,500));}throw Error('Receiver did not become ready');}
let checks=0;
try {
 docker('run','-d','--name',container,'--env-file',envFile.pathname.replace(/^\//,''),'-p','127.0.0.1:52731:10000','--mount',`type=volume,source=${volume},target=/var/data`,image);
 assert.equal((await ready()).probe,'encrypted_write_read_verified');checks++;
 const records=[{source:'auth_logs',timestamp:new Date().toISOString(),message:'PRIVATE-NOT-RETAINED',metadata:{'auth_event.action':'login',status:200}}],body=JSON.stringify(records);
 for(const provider of ['vercel','supabase']){
   const h={authorization:'Bearer '+env[provider==='vercel'?'VERCEL_DRAIN_TOKEN':'SUPABASE_DRAIN_TOKEN']};
   if(provider==='vercel')h['x-vercel-signature']=createHmac('sha1',env.VERCEL_SIGNATURE_SECRET).update(body).digest('hex');
   const r=await fetch(origin+'/ingest/'+provider,{method:'POST',headers:h,body});assert.equal(r.status,200);assert.equal((await r.json()).stored,true);checks++;
 }
 const date=new Date().toISOString().slice(0,10),manifest=await (await fetch(origin+`/admin/manifest?date=${date}&provider=vercel`,{headers})).json();
 assert.equal(manifest.receipts.length,1);checks++;
 const filePath=`/admin/file/${date}/vercel/${manifest.receipts[0].file}`;
 const cipher=Buffer.from(await(await fetch(origin+filePath,{headers})).arrayBuffer());
 assert.equal(digest(cipher),manifest.receipts[0].ciphertextSha256);assert.equal(cipher.includes(Buffer.from('PRIVATE-NOT-RETAINED')),false);checks++;
 assert.equal((await fetch(origin+filePath)).status,401);checks++;
 const files=JSON.parse(docker('exec',container,'node','--input-type=module','-e',"import {readdir} from 'node:fs/promises'; console.log(JSON.stringify(await readdir('/var/data/apgi-security-logs')));"));
 assert.deepEqual(files,['archive.sqlite']);checks++;
 docker('restart',container);await ready();
 const restarted=Buffer.from(await(await fetch(origin+filePath,{headers})).arrayBuffer());assert.ok(cipher.equals(restarted));checks++;
 assert.equal((await fetch(origin+'/admin/monitor-test',{method:'POST'})).status,401);checks++;
 assert.equal((await fetch(origin+'/admin/monitor-test',{method:'POST',headers})).status,200);
 const warning=await(await fetch(origin+'/health')).json();assert.equal(warning.status,'attention');assert.equal(warning.monitorTest,true);checks++;
 docker('exec',container,'node','--input-type=module','-e',"import {DatabaseSync} from 'node:sqlite';const d=new DatabaseSync('/var/data/apgi-security-logs/archive.sqlite');d.prepare(\"DELETE FROM archive_state WHERE key='monitor_test_until'\").run();d.close();");
 await ready();checks++;
 assert.ok(docker('exec',container,'node','--input-type=module','-e',"import{readFileSync}from'node:fs';console.log(readFileSync('/proc/1/status','utf8').split('\\n').find(l=>l.startsWith('Uid:')));").includes('1000'));checks++;
 console.log(JSON.stringify({containerIntegration:'passed',checks,persistedProviders:['vercel','supabase'],restartCiphertextIdentical:true,warningDrillDetected:true}));
}finally{
 try{console.log(docker('logs',container));docker('rm','-f',container);}catch{}
 // This is the explicitly disposable local test volume only.
 try{docker('volume','rm',volume);}catch{}
 await unlink(envFile);
}
