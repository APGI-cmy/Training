// Recovery encryption key preparation. Secrets stay in the restricted local
// directory and Windows DPAPI; only the public encryption key may leave it.
import {execFileSync} from 'node:child_process';
import {randomBytes,createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
const root='C:/Users/Johan/Codex-Work/watchdog-payment-20261103',home=join(root,'recovery-key-private');
const gpg='C:/Program Files/Git/usr/bin/gpg.exe';
await mkdir(home,{recursive:true});
const account=execFileSync('whoami',[],{encoding:'utf8',windowsHide:true}).trim();
execFileSync('icacls.exe',[home,'/inheritance:r','/grant:r',account+':(OI)(CI)F','SYSTEM:(OI)(CI)F'],{windowsHide:true,stdio:'pipe'});
let passphrase=randomBytes(36).toString('base64url');
const dpapi="Add-Type -AssemblyName System.Security; $b=[Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd()); $p=[Security.Cryptography.ProtectedData]::Protect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Write([Convert]::ToBase64String($p))";
try{
 const existing=await readFile(join(home,'passphrase.current-user.dpapi'));
 const unprotect="Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String([Console]::In.ReadToEnd()); [Console]::Write([Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)))";
 passphrase=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',unprotect],{input:existing.toString('base64'),encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']});
}catch(e){if(e.code!=='ENOENT')throw e;const sealed=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',dpapi],{input:passphrase,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']});await writeFile(join(home,'passphrase.current-user.dpapi'),Buffer.from(sealed,'base64'),{flag:'wx'});}
const gpgHome='/c/'+home.replaceAll('\\','/').slice(3);
const base=['--homedir',gpgHome,'--batch','--yes','--pinentry-mode','loopback'];
execFileSync(gpg,[...base,'--passphrase-fd','0','--quick-generate-key','APGI V2 Offsite Recovery 2026-11-03','rsa3072','encr','1y'],{input:passphrase+'\n',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:120000});
const list=execFileSync(gpg,[...base,'--with-colons','--list-keys'],{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']});
const fingerprint=list.split('\n').find(l=>l.startsWith('fpr:'))?.split(':')[9];if(!/^[A-F0-9]{40}$/.test(fingerprint??''))throw Error('Recovery key identity unavailable');
// PostgreSQL pgcrypto requires a dedicated RSA encryption subkey.
execFileSync(gpg,[...base,'--passphrase-fd','0','--quick-add-key',fingerprint,'rsa3072','encrypt','1y'],{input:passphrase+'\n',windowsHide:true,stdio:['pipe','pipe','pipe'],timeout:120000});
const pub=execFileSync(gpg,[...base,'--armor','--export',fingerprint],{windowsHide:true,stdio:['pipe','pipe','pipe']});
const secret=execFileSync(gpg,[...base,'--passphrase-fd','0','--armor','--export-secret-keys',fingerprint],{input:passphrase+'\n',windowsHide:true,stdio:['pipe','pipe','pipe']});
await writeFile(join(home,'private-key.asc'),secret,{flag:'wx'});await writeFile(join(root,'recovery-public-key.asc'),pub,{flag:'wx'});
const receipt={version:1,createdAt:new Date().toISOString(),fingerprint,publicKeySha256:createHash('sha256').update(pub).digest('hex'),privateKeyLocation:'Restricted local directory only; separate password-manager handover required',oneDriveContainsPrivateKey:false};
await writeFile(join(root,'recovery-key-receipt.json'),JSON.stringify(receipt,null,2),{flag:'wx'});
console.log(JSON.stringify(receipt));
