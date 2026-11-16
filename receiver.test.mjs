import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readFile,writeFile,rm,readdir} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {gzipSync} from 'node:zlib';import{createHmac}from'node:crypto';
import {database,closeDatabases,assessCapacity,storageProbe,sha} from './archive-store.mjs';
import {prepare,verifyPrepared,cleanup,stageBootstrap,install,migrateRemaining} from './migrate-legacy.mjs';
import {mkdir,stat} from 'node:fs/promises';
import {allowedToken,minimise,decodeBody,persistBatch,validVercelSignature,archiveManifest,readArchive,createArchiveQueue} from './receiver.mjs';

test('bounded encryption queue serialises a burst and recovers after a failed write',async()=>{const q=createArchiveQueue(3),order=[];let release;const gate=new Promise(r=>{release=r;});const a=q.run(async()=>{await gate;order.push(1);});const b=q.run(async()=>{order.push(2);throw Error('disk write failed');});const rejected=assert.rejects(b,/disk write failed/);const c=q.run(async()=>{order.push(3);});await assert.rejects(q.run(async()=>{}),/ARCHIVE_QUEUE_FULL/);release();await Promise.all([a,rejected,c]);assert.deepEqual(order,[1,2,3]);await q.run(async()=>{order.push(4);});assert.deepEqual(order,[1,2,3,4]);});
test('tokens are exact, required and separate from payload data',()=>{assert.equal(allowedToken('Bearer '+ 'x'.repeat(40),'Bearer '+'x'.repeat(40)),true);assert.equal(allowedToken('',undefined),false);assert.equal(allowedToken('Bearer '+'y'.repeat(40),'Bearer '+'x'.repeat(40)),false);});
test('drops identifiers, secrets, URLs, messages and free-form metadata',()=>{const text=JSON.stringify(minimise([{timestamp:'2026-11-03T08:00:00Z',source:'auth_logs',message:'PRIVATE',headers:{authorization:'SECRET'},metadata:{'auth_event.actor_username':'PRIVATE','auth_event.action':'login','status':'401'}}]));assert.ok(text.includes('login'));assert.ok(text.includes('401'));for(const v of ['PRIVATE','SECRET','authorization','actor_username'])assert.equal(text.includes(v),false);});
test('bounds compressed and decompressed data and event count',()=>{assert.throws(()=>decodeBody(Buffer.alloc(2*1024*1024+1)));assert.throws(()=>decodeBody(gzipSync(Buffer.alloc(5*1024*1024)),'gzip'));assert.throws(()=>minimise(Array(5001).fill({})));assert.equal(minimise(Array(300).fill({})).length,300);assert.deepEqual(decodeBody(Buffer.from('[]')),[]);});
test('acknowledges only persisted ciphertext and detects batch retries',async()=>{const root=await mkdtemp(join(tmpdir(),'apgi-archive-'));try{const config={root,provider:'supabase',records:[{source:'auth_logs'}],encrypt:async()=>Buffer.from('ENCRYPTED'),now:new Date('2026-11-03T08:00:00Z')};assert.equal((await persistBatch(config)).duplicate,false);assert.equal((await persistBatch(config)).duplicate,true);await assert.rejects(persistBatch({...config,records:[{source:'changed'}],encrypt:async()=>{throw Error('No key');}}));}finally{closeDatabases();await rm(root,{recursive:true,force:true});}});
test('never acknowledges a corrupted ciphertext retry',async()=>{const root=await mkdtemp(join(tmpdir(),'apgi-archive-'));try{const config={root,provider:'vercel',records:[{source:'edge'}],encrypt:async()=>Buffer.from('ENCRYPTED'),now:new Date('2026-11-03T08:00:00Z')};await persistBatch(config);(await database(root)).prepare("UPDATE batches SET ciphertext=?").run(Buffer.from('CORRUPT'));await assert.rejects(persistBatch(config),/ARCHIVE_INTEGRITY_FAILED/);}finally{closeDatabases();await rm(root,{recursive:true,force:true});}});
test('Vercel signature binds exact raw bytes and requires a strong configured secret',()=>{const secret='synthetic-signature-'.repeat(4),body=Buffer.from('[{}]'),signature=createHmac('sha1',secret).update(body).digest('hex');assert.equal(validVercelSignature(body,signature,secret),true);for(const [b,s,k]of[[Buffer.from('[{},{}]'),signature,secret],[body,'0'.repeat(40),secret],[body,signature,'short'],[body,undefined,secret]])assert.equal(validVercelSignature(b,s,k),false);});
test('free-form labels cannot smuggle personal information into the archive',()=>{const data=JSON.stringify(minimise([{source:'Private Person',level:'Private Person',metadata:{'auth_event.action':'Private Person'}}]));assert.equal(data.includes('Private Person'),false);});
test('export uses fixed scopes and verifies encrypted bytes against receipt',async()=>{const root=await mkdtemp(join(tmpdir(),'apgi-archive-'));try{await persistBatch({root,provider:'supabase',records:[],encrypt:async()=>Buffer.from('ENCRYPTED'),now:new Date('2026-11-03T08:00:00Z')});const m=await archiveManifest(root,'2026-11-03','supabase');assert.equal(m.receipts.length,1);assert.equal(m.next,null);assert.equal((await readArchive(root,'2026-11-03','supabase',m.receipts[0].file)).toString(),'ENCRYPTED');await assert.rejects(archiveManifest(root,'../','supabase'));await assert.rejects(readArchive(root,'2026-11-03','supabase','../../secret'));}finally{closeDatabases();await rm(root,{recursive:true,force:true});}});

async function legacyFixture(root,count=10) {
 const dir=join(root,'2026-11-03','vercel');await mkdir(dir,{recursive:true});const files=[];
 for(let i=0;i<count;i++){
  const file=sha('fixture-'+i)+'.pgp',bytes=Buffer.from('ENCRYPTED-'+i);
  const receipt=JSON.stringify({version:1,provider:'vercel',receivedAt:'2026-11-03T08:00:00Z',events:1,file,ciphertextSha256:sha(bytes)})+'\n';
  await writeFile(join(dir,file),bytes);await writeFile(join(dir,file+'.receipt.json'),receipt);
  files.push({file,bytes,receipt});
 }return files;
}
test('capacity warns at 75 percent inodes or bytes, fails before hard exhaustion',()=>{
 const base={bavail:900,blocks:1000,bsize:1024*1024,files:10000,ffree:9000};
 assert.equal(assessCapacity(base).status,'ready');
 assert.equal(assessCapacity({...base,ffree:2500}).status,'attention');
 assert.equal(assessCapacity({...base,bavail:250}).status,'attention');
 assert.equal(assessCapacity({...base,ffree:0}).status,'unavailable');
 assert.equal(assessCapacity({...base,bavail:63}).status,'unavailable');
});
test('real encrypted-write health probe detects encryption failure and read-only DB',async()=>{
 const root=await mkdtemp(join(tmpdir(),'apgi-probe-'));
 try {assert.equal((await storageProbe(root,async()=>Buffer.from('cipher'))).probe,'encrypted_write_read_verified');
 await assert.rejects(storageProbe(root,async()=>{throw Error('ENCRYPTION_FAILED');}),/ENCRYPTION_FAILED/);
 (await database(root)).exec('PRAGMA query_only=ON');await assert.rejects(storageProbe(root,async()=>Buffer.from('cipher')),/readonly/);
 }finally{closeDatabases();await rm(root,{recursive:true,force:true});}
});
test('hundreds of durable batches consume a bounded number of filesystem entries',async()=>{
 const root=await mkdtemp(join(tmpdir(),'apgi-bounded-'));
 try {for(let i=0;i<300;i++)await persistBatch({root,provider:'vercel',records:[{time:i}],encrypt:async()=>Buffer.from('cipher-'+i)});
 assert.deepEqual(await readdir(root),['archive.sqlite']);
 assert.equal((await database(root)).prepare('SELECT count(*) AS n FROM batches').get().n,300);
 closeDatabases();assert.equal((await database(root)).prepare('SELECT count(*) AS n FROM batches').get().n,300);
 }finally{closeDatabases();await rm(root,{recursive:true,force:true});}
});
test('legacy migration preserves every ciphertext, receipt and orphan byte, remains exportable',async()=>{
 const base=await mkdtemp(join(tmpdir(),'apgi-migrate-')),root=join(base,'archive'),candidate=join(base,'candidate.sqlite'),backup=join(base,'backup.json');
 try {
 const files=await legacyFixture(root,140),orphan=sha('orphan')+'.pgp.tmp';await writeFile(join(root,'2026-11-03','vercel',orphan),'ORPHAN-ENCRYPTED');
 const result=await prepare(root,candidate);assert.equal(result.files,281);assert.equal((await verifyPrepared(root,candidate)).fullSourceVerification,'passed');
 const staged=await stageBootstrap(candidate,backup);
 await assert.rejects(install(root,candidate,backup,'incorrect'),/BACKUP_NOT_CONFIRMED/);
 assert.equal((await readdir(join(root,'2026-11-03','vercel'))).length,281);
 const migration=await install(root,candidate,backup,staged.sha256);assert.equal(migration.preservedFiles,281);assert.equal(migration.unmigratedFiles,0);
 const page=await archiveManifest(root,'2026-11-03','vercel');assert.equal(page.receipts.length,140);
 for(const f of files){assert.ok((await readArchive(root,'2026-11-03','vercel',f.file)).equals(f.bytes));
 assert.equal(Buffer.from((await database(root)).prepare('SELECT bytes FROM legacy_files WHERE path=?').get('2026-11-03/vercel/'+f.file+'.receipt.json').bytes).toString(),f.receipt);}
 assert.equal(Buffer.from((await database(root)).prepare('SELECT bytes FROM legacy_files WHERE path=?').get('2026-11-03/vercel/'+orphan).bytes).toString(),'ORPHAN-ENCRYPTED');
 const next=await migrateRemaining(root);assert.equal(next.remaining,0);
 }finally{closeDatabases();await rm(base,{recursive:true,force:true});}
});
test('migration refuses source consolidation when any copied byte differs',async()=>{
 const base=await mkdtemp(join(tmpdir(),'apgi-mismatch-')),root=join(base,'archive');
 try{const files=await legacyFixture(root,2);await prepare(root,join(root,'archive.sqlite'));
 await writeFile(join(root,'2026-11-03','vercel',files[0].file),'CHANGED');
 await assert.rejects(cleanup(root),/LEGACY_COPY_MISMATCH/);
 assert.equal((await readdir(join(root,'2026-11-03','vercel'))).length,4);
 }finally{closeDatabases();await rm(base,{recursive:true,force:true});}
});
test('manifest pagination covers mixed legacy and new batches without changing old ciphertext',async()=>{
 const base=await mkdtemp(join(tmpdir(),'apgi-pages-')),root=join(base,'archive');
 try {await legacyFixture(root,260);await migrateRemaining(root);
 await persistBatch({root,provider:'vercel',records:[{source:'edge'}],encrypt:async()=>Buffer.from('new-cipher'),now:new Date('2026-11-03')});
 const a=await archiveManifest(root,'2026-11-03','vercel'),b=await archiveManifest(root,'2026-11-03','vercel',a.next);
 assert.equal(a.receipts.length,250);assert.equal(b.receipts.length,11);assert.equal(b.next,null);
 assert.equal(new Set([...a.receipts,...b.receipts].map(r=>r.file)).size,261);
 }finally{closeDatabases();await rm(base,{recursive:true,force:true});}
});
