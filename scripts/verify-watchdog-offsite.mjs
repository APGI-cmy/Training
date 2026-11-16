import {execFileSync} from 'node:child_process';
import {createHash,createDecipheriv} from 'node:crypto';
import {readFile,writeFile,mkdir,copyFile,realpath,readdir} from 'node:fs/promises';
import {join} from 'node:path';
const root='C:/Users/Johan/Codex-Work/watchdog-payment-20261103',privateHome=root+'/recovery-key-private';
const destination='C:/Users/Johan/OneDrive/Documents/ChatGPT/Training portal platform/Security backups/2026-11-03';
const prior='C:/Users/Johan/Codex-Work/watchdog-recovery-20261103/storage-backup-1793688684564';
const gpg='C:/Program Files/Git/usr/bin/gpg.exe',base=['--homedir','/c/'+privateHome.slice(3),'--batch','--yes','--pinentry-mode','loopback'];
const sha=b=>createHash('sha256').update(b).digest('hex');
function dpapi(bytes,text=false){const command="Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $p=[Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Write([Convert]::ToBase64String($p))";const value=Buffer.from(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{input:bytes.toString('base64'),encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}),'base64');return text?value.toString('utf8'):value;}
const passphrase=dpapi(await readFile(privateHome+'/passphrase.current-user.dpapi'),true),keyReceipt=JSON.parse(await readFile(root+'/recovery-key-receipt.json','utf8'));
await mkdir(destination,{recursive:true});const actual=await realpath(destination);if(!actual.replaceAll('\\','/').startsWith('C:/Users/Johan/OneDrive/'))throw Error('Approved OneDrive destination mismatch');
const decrypt=path=>execFileSync(gpg,[...base,'--passphrase-fd','0','--decrypt',path.replaceAll('\\','/').replace('C:/','/c/')],{input:passphrase+'\n',windowsHide:true,stdio:['pipe','pipe','pipe'],maxBuffer:64*1024*1024});
const encrypt=(bytes,path)=>execFileSync(gpg,[...base,'--trust-model','always','--recipient',keyReceipt.fingerprint,'--cipher-algo','AES256','--output',path.replaceAll('\\','/').replace('C:/','/c/'),'--encrypt'],{input:bytes,windowsHide:true,stdio:['pipe','pipe','pipe'],maxBuffer:64*1024*1024});
const snapshot=JSON.parse(await readFile(root+'/database-encrypted-snapshot.json','utf8'));if(snapshot.tables.length!==135||snapshot.fingerprint!==keyReceipt.fingerprint)throw Error('Backup identity mismatch');
const tmp=privateHome+'/verification-ciphertext';await mkdir(tmp,{recursive:true});
let rows=0;const tables=[];
for(const [i,t] of snapshot.tables.entries()){
 const file=join(tmp,`${i}.pgp`);await writeFile(file,Buffer.from(t.ciphertext,'base64'));
 const plain=decrypt(file),value=JSON.parse(plain);if(value.schema!==t.schema||value.table!==t.table||value.rows.length!==t.rows)throw Error('Database archive recovery verification failed');
 rows+=value.rows.length;tables.push({schema:t.schema,table:t.table,rows:value.rows.length,plaintextSha256:sha(plain)});plain.fill(0);
}
const snapshotBytes=await readFile(root+'/database-encrypted-snapshot.json');
try{await writeFile(destination+'/database-encrypted-snapshot.json',snapshotBytes,{flag:'wx'});}catch(e){if(e.code!=='EEXIST'||sha(await readFile(destination+'/database-encrypted-snapshot.json'))!==sha(snapshotBytes))throw e;}
const storageKey=dpapi(await readFile(prior+'/key.current-user.dpapi')),storageReceipt=JSON.parse(await readFile('C:/Users/Johan/Codex-Work/watchdog-recovery-20261103/storage-restore-receipt.json','utf8')),files=[];
for(const [i,expected] of storageReceipt.objects.entries()){
 const bytes=await readFile(join(prior,String(i).padStart(3,'0')+'.aesgcm')),decipher=createDecipheriv('aes-256-gcm',storageKey,bytes.subarray(0,12));decipher.setAuthTag(bytes.subarray(12,28));
 const plain=Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]),value=JSON.parse(plain),content=Buffer.from(value.data,'base64');
 if(sha(content)!==expected.sha256)throw Error('Original file snapshot integrity failed');
 const name=`storage-${String(i).padStart(3,'0')}.pgp`,path=destination+'/'+name;encrypt(plain,path);const recovered=decrypt(path);if(sha(recovered)!==sha(plain))throw Error('Portable encrypted file recovery failed');
 files.push({file:name,ciphertextSha256:sha(await readFile(path)),contentSha256:expected.sha256,bytes:expected.bytes,private:expected.private});plain.fill(0);recovered.fill(0);content.fill(0);
}
storageKey.fill(0);
await copyFile(root+'/recovery-public-key.asc',destination+'/recovery-public-key.asc');
const receipt={version:1,createdAt:new Date().toISOString(),destination,source:'eaaqgtdpvbxdgjxphjie',fingerprint:keyReceipt.fingerprint,databaseCapturedAt:snapshot.capturedAt,fileSnapshotAt:storageReceipt.startedAt,tables:tables.length,rows,files:files.length,databaseCiphertextSha256:sha(snapshotBytes),fileChecks:files,allDecryptedAndVerified:true,privateKeyInOneDrive:false,limitations:['Local synced-path write is not by itself proof of cloud arrival; verify in OneDrive web.','The database and Storage snapshots have different capture times.','The private recovery key and its passphrase must be saved separately in a password manager.','This snapshot does not configure continuous provider log streaming or approve production recovery objectives.']};
await writeFile(destination+'/backup-receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});await writeFile(root+'/offsite-backup-verification.json',JSON.stringify({...receipt,tableChecks:tables},null,2),{flag:'wx'});
await writeFile(destination+'/README.txt','APGI V2 encrypted recovery archive.\nDatabase records were encrypted inside PostgreSQL before export. Storage objects use portable OpenPGP encryption.\nNo private key or passphrase is stored here. Obtain the separate recovery-key package from the authorised APGI password manager.\nCheck backup-receipt.json and verify hashes before recovery. Source code and application secrets require separate recovery arrangements.\n');
console.log(JSON.stringify({complete:true,tables:tables.length,rows,files:files.length,destination,privateKeyInOneDrive:false}));
