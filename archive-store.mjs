import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {mkdir, statfs, readFile, stat} from 'node:fs/promises';
import {join} from 'node:path';

export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const databasePath = root => join(root, 'archive.sqlite');
const handles = new Map();
export function openDatabase(file, {readOnly = false} = {}) {
  const db = new DatabaseSync(file, {readOnly});
  db.exec('PRAGMA busy_timeout=5000');
  if (!readOnly) {
    db.exec(`PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS batches (
        date TEXT NOT NULL, provider TEXT NOT NULL, file TEXT NOT NULL,
        ciphertext BLOB NOT NULL, receipt TEXT NOT NULL,
        PRIMARY KEY(date, provider, file));
      CREATE TABLE IF NOT EXISTS legacy_files (
        path TEXT PRIMARY KEY, bytes BLOB NOT NULL, sha256 TEXT NOT NULL,
        mode INTEGER NOT NULL, mtime REAL NOT NULL);
      CREATE TABLE IF NOT EXISTS archive_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  }
  return db;
}
export async function database(root) {
  if (!handles.has(root)) {
    await mkdir(root, {recursive:true});
    // A single event-loop turn owns opening, avoiding duplicate connections.
    if (!handles.has(root)) handles.set(root, openDatabase(databasePath(root)));
  }
  return handles.get(root);
}
export function closeDatabases() { for (const db of handles.values()) db.close(); handles.clear(); }
export function scope(date, provider, file) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !['vercel','supabase'].includes(provider) ||
      file !== undefined && !/^[a-f0-9]{64}\.pgp$/.test(file)) throw Error('INVALID_ARCHIVE_SCOPE');
}
export function verifiedCipher(ciphertext, receipt, file) {
  const r = JSON.parse(receipt), bytes = Buffer.from(ciphertext);
  if (r.file !== file || r.ciphertextSha256 !== sha(bytes)) throw Error('ARCHIVE_INTEGRITY_FAILED');
  return {bytes, receipt:r};
}
export async function archiveManifest(root, date, provider, cursor=0) {
  scope(date, provider);
  if (!Number.isInteger(cursor) || cursor<0 || cursor>1000000) throw Error('INVALID_ARCHIVE_SCOPE');
  const db = await database(root), prefix = `${date}/${provider}/`;
  const rows = db.prepare(`SELECT file, receipt FROM batches WHERE date=? AND provider=?
    UNION SELECT substr(path,?), CAST(bytes AS TEXT) FROM legacy_files
    WHERE path LIKE ? AND path GLOB '*.pgp.receipt.json'
    ORDER BY file LIMIT 251 OFFSET ?`).all(date, provider, prefix.length+1, prefix+'%', cursor);
  const receipts = rows.slice(0,250).map(row => {
    const r=JSON.parse(row.receipt);
    if (!/^[a-f0-9]{64}\.pgp$/.test(r.file??'') || !/^[a-f0-9]{64}$/.test(r.ciphertextSha256??'')) throw Error('INVALID_RECEIPT');
    return r;
  });
  return {receipts, next:rows.length>250?cursor+250:null};
}
export async function readArchive(root, date, provider, file) {
  scope(date, provider, file);
  const db=await database(root), batch=db.prepare('SELECT ciphertext,receipt FROM batches WHERE date=? AND provider=? AND file=?').get(date,provider,file);
  if (batch) return verifiedCipher(batch.ciphertext,batch.receipt,file).bytes;
  const prefix=`${date}/${provider}/${file}`;
  const cipher=db.prepare('SELECT bytes,sha256 FROM legacy_files WHERE path=?').get(prefix);
  const receipt=db.prepare('SELECT bytes,sha256 FROM legacy_files WHERE path=?').get(prefix+'.receipt.json');
  if (!cipher || !receipt || sha(cipher.bytes)!==cipher.sha256 || sha(receipt.bytes)!==receipt.sha256) throw Error('ARCHIVE_INTEGRITY_FAILED');
  return verifiedCipher(cipher.bytes,Buffer.from(receipt.bytes).toString('utf8'),file).bytes;
}
export function assessCapacity(s) {
  const freeBytes=Number(s.bavail)*Number(s.bsize), totalBytes=Number(s.blocks)*Number(s.bsize);
  const totalFiles=Number(s.files), freeFiles=Number(s.ffree);
  // files=0 means the platform does not report inode limits (e.g. Windows).
  const bytesUsed=totalBytes>0?1-freeBytes/totalBytes:0;
  const filesUsed=totalFiles>0?1-freeFiles/totalFiles:0;
  const critical=freeBytes<64*1024*1024 || totalFiles>0 && freeFiles<128;
  const warning=bytesUsed>=0.75 || filesUsed>=0.75 || freeBytes<512*1024*1024;
  return {status:critical?'unavailable':warning?'attention':'ready',
    freeBytes, freeFiles:totalFiles?freeFiles:null,
    bytesUsedPercent:Math.round(bytesUsed*10000)/100,
    filesUsedPercent:totalFiles?Math.round(filesUsed*10000)/100:null};
}
export async function persistBatch({root, provider, records, encrypt, now=new Date()}) {
  const date=now.toISOString().slice(0,10); scope(date,provider);
  await mkdir(root,{recursive:true});
  if (assessCapacity(await statfs(root)).status==='unavailable') throw Error('ARCHIVE_CAPACITY_LOW');
  const db=await database(root), file=sha(JSON.stringify(records))+'.pgp';
  const existing=db.prepare('SELECT ciphertext,receipt FROM batches WHERE date=? AND provider=? AND file=?').get(date,provider,file);
  const old=db.prepare('SELECT bytes FROM legacy_files WHERE path=?').get(`${date}/${provider}/${file}.receipt.json`);
  if (existing || old) {
    const bytes=await readArchive(root,date,provider,file), r=JSON.parse(existing?.receipt??Buffer.from(old.bytes).toString());
    if (r.events!==records.length || !bytes.length) throw Error('ARCHIVE_INTEGRITY_FAILED');
    return {duplicate:true, events:records.length};
  }
  const payload=Buffer.from(JSON.stringify({version:1,provider,receivedAt:now.toISOString(),redaction:'Allowlisted security metadata only; identities, addresses, paths, queries, headers and message bodies are omitted.',records}));
  const encrypted=await encrypt(payload);
  if (!Buffer.isBuffer(encrypted) || !encrypted.length || encrypted.length>8*1024*1024) throw Error('ENCRYPTION_FAILED');
  const receipt={version:1,provider,receivedAt:now.toISOString(),events:records.length,file,ciphertextSha256:sha(encrypted)};
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO batches VALUES (?,?,?,?,?)').run(date,provider,file,encrypted,JSON.stringify(receipt));
    db.prepare('INSERT OR REPLACE INTO archive_state VALUES (?,?)').run('last_success_'+provider,now.toISOString());
    db.exec('COMMIT');
  } catch(e) { db.exec('ROLLBACK'); throw e; }
  // SQLite FULL synchronous commits both ciphertext and receipt before ACK.
  return {duplicate:false,events:records.length};
}
export async function storageProbe(root, encrypt, now=new Date()) {
  const capacity=assessCapacity(await statfs(root));
  if (capacity.status==='unavailable') return {...capacity,probe:'capacity_failed'};
  const cipher=await encrypt(Buffer.from(JSON.stringify({type:'archive-readiness-probe',time:now.toISOString()})));
  if (!Buffer.isBuffer(cipher)||!cipher.length) throw Error('ENCRYPTION_FAILED');
  const db=await database(root), value=sha(cipher);
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT OR REPLACE INTO archive_state VALUES (?,?)').run('readiness_probe',value);
    db.exec('COMMIT');
  } catch(e) { db.exec('ROLLBACK'); throw e; }
  if (db.prepare("SELECT value FROM archive_state WHERE key='readiness_probe'").get()?.value!==value) throw Error('ARCHIVE_PROBE_FAILED');
  return {...capacity,probe:'encrypted_write_read_verified',checkedAt:now.toISOString()};
}
