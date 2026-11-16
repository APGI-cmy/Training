// Explicit owner-run verification inside the existing Render archive instance.
// Credentials are read in memory; no credential or log payload is printed.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash,createHmac} from 'node:crypto';
import {setImmediate} from 'node:timers/promises';
import {minimise} from '/app/receiver.mjs';
const origin='https://apgi-v2-security-log-archive.onrender.com';
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const k of ['ARCHIVE_READ_TOKEN','VERCEL_DRAIN_TOKEN','SUPABASE_DRAIN_TOKEN','VERCEL_SIGNATURE_SECRET'])assert.ok(process.env[k]?.length>=32,'Required configured credential unavailable');
const ownerHeaders={authorization:'Bearer '+process.env.ARCHIVE_READ_TOKEN};
const db=new DatabaseSync('/var/data/apgi-security-logs/archive.sqlite',{readOnly:true});
db.exec('PRAGMA busy_timeout=5000');
try {
  const initial=JSON.parse(db.prepare('SELECT value FROM archive_state WHERE key=?').get('initial_legacy_migration').value);
  assert.equal(initial.files,327637);
  assert.equal(initial.sourceManifestSha256,'3fbb147ee709047c5a49553cc0a39e0daaf69eb61c494d17d63e7aad4c3f4981');
  // Short read transactions avoid blocking ongoing provider commits during the scan.
  const scan=db.prepare('SELECT path,bytes,sha256 FROM legacy_files WHERE path>? AND path<? ORDER BY path LIMIT 64');
  const manifest=createHash('sha256');let cursor='',count=0,totalBytes=0;
  for(;;){
    const rows=scan.all(cursor,'2026-11-13/');if(!rows.length)break;
    for(const r of rows){const bytes=Buffer.from(r.bytes),hash=sha(bytes);assert.equal(hash,r.sha256);manifest.update(`${r.path}\t${hash}\t${bytes.length}\n`);count++;totalBytes+=bytes.length;}
    cursor=rows.at(-1).path;await setImmediate();
  }
  const manifestHash=manifest.digest('hex');
  assert.equal(count,initial.files);assert.equal(totalBytes,initial.bytes);assert.equal(manifestHash,initial.sourceManifestSha256);
  console.log(JSON.stringify({historicalPreservation:'passed',files:count,bytes:totalBytes,manifestSha256:manifestHash}));

  const historical=db.prepare("SELECT path,bytes FROM legacy_files WHERE path GLOB '*.pgp.receipt.json' ORDER BY path LIMIT 1").get();
  const receipt=JSON.parse(Buffer.from(historical.bytes).toString()),oldPath=historical.path.slice(0,-13);
  const oldResponse=await fetch(origin+'/admin/file/'+oldPath,{headers:ownerHeaders});assert.equal(oldResponse.status,200);
  assert.equal(sha(Buffer.from(await oldResponse.arrayBuffer())),receipt.ciphertextSha256);

  const results=[];
  for(const provider of ['vercel','supabase']){
    const records=[{timestamp:Date.now(),source:provider==='vercel'?'edge':'auth_logs',level:'info',statusCode:200}];
    const body=JSON.stringify(records),headers={authorization:'Bearer '+process.env[provider==='vercel'?'VERCEL_DRAIN_TOKEN':'SUPABASE_DRAIN_TOKEN']};
    if(provider==='vercel')headers['x-vercel-signature']=createHmac('sha1',process.env.VERCEL_SIGNATURE_SECRET).update(body).digest('hex');
    const response=await fetch(origin+'/ingest/'+provider,{method:'POST',headers,body});assert.equal(response.status,200);assert.equal((await response.json()).stored,true);
    const date=new Date().toISOString().slice(0,10),file=sha(JSON.stringify(minimise(records)))+'.pgp';
    const saved=db.prepare('SELECT ciphertext,receipt FROM batches WHERE date=? AND provider=? AND file=?').get(date,provider,file);
    assert.ok(saved);const r=JSON.parse(saved.receipt);assert.equal(sha(saved.ciphertext),r.ciphertextSha256);assert.equal(r.events,1);
    const downloaded=await fetch(origin+`/admin/file/${date}/${provider}/${file}`,{headers:ownerHeaders});assert.equal(downloaded.status,200);
    assert.equal(sha(Buffer.from(await downloaded.arrayBuffer())),r.ciphertextSha256);
    const retry=await fetch(origin+'/ingest/'+provider,{method:'POST',headers,body});assert.equal(retry.status,200);
    assert.equal(db.prepare('SELECT count(*) AS n FROM batches WHERE date=? AND provider=? AND file=?').get(date,provider,file).n,1);
    results.push({provider,status:200,persisted:true,downloadHashVerified:true,retryDeduplicated:true});
  }
  assert.equal((await fetch(origin+'/admin/manifest?date=2026-11-03&provider=vercel')).status,401);
  const health=await(await fetch(origin+'/health')).json();assert.equal(health.status,'ready');assert.equal(health.probe,'encrypted_write_read_verified');
  console.log(JSON.stringify({liveVerification:'passed',historicalExportHashVerified:true,providers:results,unauthorisedExportDenied:true,health}));
}finally{db.close();}
