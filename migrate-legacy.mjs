// No decryption or retention deletion. Original file bytes are retained in SQLite.
import {DatabaseSync} from 'node:sqlite';
import {readFile,writeFile,mkdir,readdir,lstat,unlink,open,copyFile,chmod,statfs,realpath} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {databasePath,openDatabase,sha} from './archive-store.mjs';

export async function inventory(root) {
  const result=[];
  for(const date of (await readdir(root)).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort()) {
    for(const provider of (await readdir(join(root,date))).sort()) {
      if(!['vercel','supabase'].includes(provider)) throw Error('UNEXPECTED_LEGACY_PROVIDER');
      for(const file of (await readdir(join(root,date,provider))).sort()) {
        if(!/^[a-f0-9]{64}\.pgp(?:\.receipt\.json|\.tmp)?$/.test(file)) throw Error('UNEXPECTED_LEGACY_FILE');
        const path=`${date}/${provider}/${file}`,s=await lstat(join(root,path));
        if(!s.isFile()||s.isSymbolicLink()) throw Error('UNSAFE_LEGACY_FILE');
        result.push({path,mode:s.mode,mtime:s.mtimeMs,size:s.size});
      }
    }
  }
  return result;
}
async function syncFile(file) {const f=await open(file,process.platform==='win32'?'r+':'r');try{await f.sync();}finally{await f.close();}}
async function syncDir(dir) {if(process.platform==='win32')return;const f=await open(dir,'r');try{await f.sync();}finally{await f.close();}}
async function fileHash(file) {const h=createHash('sha256');for await(const b of createReadStream(file))h.update(b);return h.digest('hex');}
export async function prepare(root,candidate) {
  const files=await inventory(root),db=openDatabase(candidate);
  let count=0,totalBytes=0;const manifest=createHash('sha256');
  try {
    const insert=db.prepare('INSERT OR IGNORE INTO legacy_files VALUES (?,?,?,?,?)');
    for(let i=0;i<files.length;i+=500) {
      db.exec('BEGIN IMMEDIATE');
      try {
        for(const f of files.slice(i,i+500)) {
          const bytes=await readFile(join(root,f.path)),hash=sha(bytes);
          insert.run(f.path,bytes,hash,f.mode,f.mtime);
          const row=db.prepare('SELECT sha256 FROM legacy_files WHERE path=?').get(f.path);
          if(row.sha256!==hash) throw Error('LEGACY_SOURCE_CHANGED');
          manifest.update(`${f.path}\t${hash}\t${bytes.length}\n`);totalBytes+=bytes.length;count++;
        }
        db.exec('COMMIT');
        if(count%25000===0)console.log(JSON.stringify({phase:'copy',files:count}));
      }catch(e){db.exec('ROLLBACK');throw e;}
    }
    let validPairs=0,invalidPairs=0;
    for(const row of db.prepare("SELECT path,bytes FROM legacy_files WHERE path GLOB '*.pgp.receipt.json'").iterate()) {
      try {
        const r=JSON.parse(Buffer.from(row.bytes).toString()),cipher=db.prepare('SELECT sha256 FROM legacy_files WHERE path=?').get(row.path.slice(0,-13));
        if(!cipher||r.ciphertextSha256!==cipher.sha256)invalidPairs++;else validPairs++;
      }catch{invalidPairs++;}
    }
    const result={version:1,files:count,bytes:totalBytes,sourceManifestSha256:manifest.digest('hex'),validPairs,invalidPairs};
    db.prepare('INSERT OR REPLACE INTO archive_state VALUES (?,?)').run('legacy_migration',JSON.stringify(result));
    if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok') throw Error('DATABASE_INTEGRITY_FAILED');
    // Full byte comparison against the still untouched source, not a sample.
    let verified=0;
    for(const f of files) {
      const bytes=await readFile(join(root,f.path)),row=db.prepare('SELECT bytes,sha256 FROM legacy_files WHERE path=?').get(f.path);
      if(!Buffer.from(row.bytes).equals(bytes)||sha(bytes)!==row.sha256)throw Error('LEGACY_COPY_MISMATCH');
      if(++verified%25000===0)console.log(JSON.stringify({phase:'verify',files:verified}));
    }
    return result;
  }finally{db.close();await syncFile(candidate);}
}
export async function stageBootstrap(candidate,stageFile) {
  const db=openDatabase(candidate,{readOnly:true});
  try {
    const rows=db.prepare('SELECT * FROM legacy_files ORDER BY path LIMIT 8').all();
    if(rows.length<8) throw Error('BOOTSTRAP_NOT_NEEDED');
    const backup=rows.map(r=>({...r,bytes:Buffer.from(r.bytes).toString('base64')}));
    await writeFile(stageFile,JSON.stringify({version:1,files:backup})+'\n',{flag:'wx',mode:0o600});await syncFile(stageFile);
    return {file:stageFile,sha256:sha(await readFile(stageFile)),files:rows.length};
  }finally{db.close();}
}
export async function install(root,candidate,stageFile,expectedBackupHash) {
  root=await realpath(root);const target=databasePath(root);
  const backupBytes=await readFile(stageFile);
  if(sha(backupBytes)!==expectedBackupHash)throw Error('BACKUP_NOT_CONFIRMED');
  const backup=JSON.parse(backupBytes),db=openDatabase(candidate,{readOnly:true});
  try {
    // Eight files are recoverable both from the verified database and the
    // separately downloaded bootstrap backup before freeing their inodes.
    for(const f of backup.files) {
      if(!/^\d{4}-\d{2}-\d{2}\/(vercel|supabase)\/[a-f0-9]{64}\.pgp(?:\.receipt\.json|\.tmp)?$/.test(f.path))throw Error('INVALID_BACKUP_PATH');
      const original=await readFile(join(root,f.path)),row=db.prepare('SELECT bytes,sha256 FROM legacy_files WHERE path=?').get(f.path);
      if(!row||!original.equals(Buffer.from(row.bytes))||!original.equals(Buffer.from(f.bytes,'base64'))||sha(original)!==f.sha256)throw Error('BOOTSTRAP_MISMATCH');
    }
    try {await lstat(target);throw Error('TARGET_ALREADY_EXISTS');}catch(e){if(e.code!=='ENOENT')throw e;}
    for(const f of backup.files)await unlink(join(root,f.path));
    await copyFile(candidate,target,1);await chmod(target,0o600);await syncFile(target);await syncDir(root);
    if(await fileHash(target)!==await fileHash(candidate))throw Error('INSTALLED_DATABASE_MISMATCH');
  }finally{db.close();}
  return cleanup(root);
}
export async function cleanup(root) {
  root=await realpath(root);const db=openDatabase(databasePath(root),{readOnly:true});let removed=0,retained=0;
  try {
    if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('DATABASE_INTEGRITY_FAILED');
    const files=await inventory(root);
    // Global verification succeeds before any source consolidation begins.
    for(const f of files) {
      const row=db.prepare('SELECT bytes,sha256 FROM legacy_files WHERE path=?').get(f.path);
      if(!row){retained++;continue;}
      const bytes=await readFile(join(root,f.path));
      if(!Buffer.from(row.bytes).equals(bytes)||sha(bytes)!==row.sha256)throw Error('LEGACY_COPY_MISMATCH');
    }
    for(const f of files) {
      const row=db.prepare('SELECT sha256 FROM legacy_files WHERE path=?').get(f.path);
      if(!row)continue;
      if(sha(await readFile(join(root,f.path)))!==row.sha256)throw Error('LEGACY_SOURCE_CHANGED');
      await unlink(join(root,f.path));removed++;
      if(removed%25000===0)console.log(JSON.stringify({phase:'consolidate',files:removed}));
    }
    for(const d of new Set(files.map(f=>join(root,...f.path.split('/').slice(0,2)))))await syncDir(d);
    return {consolidatedFiles:removed,unmigratedFiles:retained,preservedFiles:db.prepare('SELECT count(*) AS n FROM legacy_files').get().n};
  }finally{db.close();}
}
export async function migrateRemaining(root) {
  const files=await inventory(root);if(!files.length)return {remaining:0};
  const result=await prepare(root,databasePath(root));return {...result,...await cleanup(root)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [command,root=process.env.ARCHIVE_DIRECTORY??'/var/data/apgi-security-logs',candidate='/tmp/apgi-archive-migration.sqlite',stageFile='/tmp/apgi-bootstrap-backup.json',backupHash]=process.argv.slice(2);
 const actions={prepare:()=>prepare(root,candidate),stage:()=>stageBootstrap(candidate,stageFile),install:()=>install(root,candidate,stageFile,backupHash),remaining:()=>migrateRemaining(root),cleanup:()=>cleanup(root)};
 if(!actions[command])throw Error('UNKNOWN_MIGRATION_COMMAND');
 console.log(JSON.stringify(await actions[command]()));
}
