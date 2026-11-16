// Encrypt the complete, verified deployment archive as a stream. No clear-text
// application archive or private key is written under OneDrive.
import {createReadStream,createWriteStream} from 'node:fs';
import {readFile,writeFile,rename,stat} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pipeline} from 'node:stream/promises';
const root='C:/Users/Johan/Codex-Work/watchdog-payment-20261103',home=root+'/recovery-key-private',dest='C:/Users/Johan/OneDrive/Documents/ChatGPT/Training portal platform/Security backups/2026-11-03/application-source-and-courses.tgz.pgp';
const parts=JSON.parse(await readFile(root+'/full-archive-parts.json')),verified=JSON.parse(await readFile(root+'/archive-verification.json')),key=JSON.parse(await readFile(root+'/recovery-key-receipt.json'));
if(!verified.completeApplicationAndCourses||parts.length!==290)throw Error('Complete verified archive required');
const gpg='C:/Program Files/Git/usr/bin/gpg.exe',base=['--homedir','/c/'+home.slice(3),'--batch','--yes'];
let bytes=0;const digest=createHash('sha256');
async function* input(){for(const p of parts){const hash=createHash('sha1');let size=0;for await(const b of createReadStream(p.local)){hash.update(b);digest.update(b);bytes+=b.length;size+=b.length;yield b;}if(size!==p.size||hash.digest('hex')!==p.sha)throw Error('Deployment archive component changed');}}
let exists=false;try{exists=(await stat(dest)).size>0;}catch(e){if(e.code!=='ENOENT')throw e;}
if(exists){for await(const _ of input()){} }else{
 const encrypt=spawn(gpg,[...base,'--trust-model','always','--recipient',key.fingerprint,'--cipher-algo','AES256','--compress-algo','none','--encrypt'],{windowsHide:true,stdio:['pipe','pipe','pipe']});encrypt.stderr.resume();const exit=new Promise((resolve,reject)=>{encrypt.on('error',()=>reject(Error('Archive encryption unavailable')));encrypt.on('close',c=>c===0?resolve():reject(Error('Archive encryption failed')));});
 await Promise.all([pipeline(input(),encrypt.stdin),pipeline(encrypt.stdout,createWriteStream(dest+'.partial',{flags:'wx'})),exit]);await rename(dest+'.partial',dest);
}
const original=digest.digest('hex');
const dp="Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); [Console]::Write([Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)))";
const pass=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',dp],{input:(await readFile(home+'/passphrase.current-user.dpapi')).toString('base64'),encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']});
const recover=spawn(gpg,[...base,'--pinentry-mode','loopback','--passphrase-fd','0','--decrypt',dest.replace('C:/','/c/')],{windowsHide:true,stdio:['pipe','pipe','pipe']});recover.stderr.resume();const recovered=createHash('sha256'),closed=new Promise((resolve,reject)=>{recover.on('error',()=>reject(Error('Archive recovery unavailable')));recover.on('close',c=>c===0?resolve():reject(Error('Archive recovery failed')));});recover.stdin.end(pass+'\n');for await(const b of recover.stdout)recovered.update(b);await closed;if(recovered.digest('hex')!==original)throw Error('Application recovery archive hash mismatch');
const cipher=createHash('sha256');for await(const b of createReadStream(dest))cipher.update(b);
const receipt={version:1,finishedAt:new Date().toISOString(),file:'application-source-and-courses.tgz.pgp',compressedBytes:bytes,ciphertextBytes:(await stat(dest)).size,compressedSha256:original,ciphertextSha256:cipher.digest('hex'),files:verified.files,fullStreamDecryptedAndHashVerified:true,privateKeyInOneDrive:false,cloudArrivalVerified:false,limitations:['This includes source/course files, not provider-managed environment secrets or a deployable copy of account credentials.','OneDrive web arrival and owner key escrow require separate evidence.']};
await writeFile(root+'/application-offsite-receipt.json',JSON.stringify(receipt,null,2));await writeFile(dest+'.receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
