// Transport adapter for this isolated local recovery copy only. It never edits
// or relaxes the deployed application's environment/provider guards.
import {readFile,writeFile,cp,readdir,lstat} from 'node:fs/promises';
import {execFileSync,spawn} from 'node:child_process';
import {randomBytes,generateKeyPairSync} from 'node:crypto';
import {join} from 'node:path';
const root='C:/Users/Johan/Codex-Work/watchdog-payment-20261103',app=root+'/local-recovery/application';
const cli='C:/Users/Johan/AppData/Local/npm-cache/_npx/0e23c24576954b26/node_modules/@supabase/cli-windows-x64/bin/supabase.exe';
const config=JSON.parse(execFileSync(cli,['status','--workdir',root+'/local-recovery','-o','json'],{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}));
const publicKey=config.ANON_KEY??config.anon_key,serviceKey=config.SERVICE_ROLE_KEY??config.service_role_key;
if((config.API_URL??config.api_url)!=='http://127.0.0.1:55321'||!publicKey||!serviceKey)throw Error('Local recovery provider configuration mismatch');
// All published ports must be loopback-only before this app can see the copy.
const containers=['db','kong','inbucket','storage','rest','auth'].map(n=>'supabase_'+n+'_apgi-full-recovery-20261103-c');
for(const name of containers){const c=JSON.parse(execFileSync('docker',['inspect',name],{encoding:'utf8',windowsHide:true}))[0];for(const list of Object.values(c.HostConfig.PortBindings??{}))for(const p of list??[])if(p.HostIp!=='127.0.0.1')throw Error('Recovery port exposure rejected');}
// Reapply current reviewed code, excluding all public source files with
// pre-existing edits. The complete asset tree came from the verified archive.
const source='C:/Users/Johan/Codex-Work/ea-lu1-lu2-20261102/source';
for(const dir of ['app','src'])await cp(source+'/'+dir,app+'/'+dir,{recursive:true,force:true});
const nextConfig=(await readFile(source+'/next.config.ts','utf8')).replace('root: process.cwd()','root: "C:/Users/Johan/Codex-Work"');await writeFile(app+'/next.config.ts',nextConfig);
const isolation=`export const STAGING_PROJECT_ID='local-recovery-only';export const STAGING_DATABASE_REF='local-recovery-only';export const STAGING_ORIGIN='http://127.0.0.1:8961';export const LIVE_DATABASE_REF='never-connected';export const STAGING_EMAIL_SCOPE='disabled';export const stagingEmailEnabled=()=>false;export const usesStagingMailCapture=()=>true;export function assertStagingIsolation(env=process.env){if(env.APGI_RECOVERY_DRILL!=='20261103-loopback-only'||env.NEXT_PUBLIC_SUPABASE_URL!=='http://127.0.0.1:55321'||env.NEXT_PUBLIC_APP_URL!=='http://127.0.0.1:8961'||env.ALP_EMAIL_MODE!=='disabled'||env.ALP_PAYMENTS_MODE!=='disabled'||env.SCANNEX_VIEWER_LAB_ENABLED!=='false'||env.VERCEL)throw Error('RECOVERY_ISOLATION_BLOCKED');for(const k of ['STAGING_RESEND_API_KEY','RESEND_API_KEY','STRIPE_SECRET_KEY','AWS_ACCESS_KEY_ID','AWS_ROLE_ARN','AIMC_GATEWAY_API_KEY'])if(env[k])throw Error('RECOVERY_OUTBOUND_BLOCKED');}`;
await writeFile(app+'/src/server/environment-isolation.ts',isolation);
await writeFile(app+'/src/server/security/provider-fetch.ts',`import 'server-only';export function providerTarget(input:string|URL,init:RequestInit={}){const u=new URL(String(input));if(u.origin!=='http://127.0.0.1:55321'||!/^\\/(auth|rest|storage)\\/v1\\//.test(u.pathname)||u.username||u.password||u.hash||new Headers(init.headers).has('cookie'))throw Error('RECOVERY_OUTBOUND_BLOCKED');return u;}export function providerFetch(input:string|URL,init:RequestInit={}){return fetch(providerTarget(input,init),{...init,redirect:'error',cache:'no-store',signal:init.signal??AbortSignal.timeout(12000)});}`);
let replaced=0;
async function adapt(dir){for(const e of await readdir(dir,{withFileTypes:true})){const path=join(dir,e.name);if(e.isDirectory())await adapt(path);else if(/\.tsx?$/.test(e.name)&&!path.endsWith('environment-isolation.ts')){let text=await readFile(path,'utf8');const old=text;text=text.replaceAll('https://${STAGING_DATABASE_REF}.supabase.co','http://127.0.0.1:55321');if(text!==old){await writeFile(path,text);replaced++;}}}}
await adapt(app+'/src');
const key=generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8',format:'der'}).toString('base64');
const env={PATH:process.env.PATH,SYSTEMROOT:process.env.SYSTEMROOT,TEMP:process.env.TEMP,TMP:process.env.TMP,USERPROFILE:process.env.USERPROFILE,APPDATA:process.env.APPDATA,LOCALAPPDATA:process.env.LOCALAPPDATA,
 APGI_RECOVERY_DRILL:'20261103-loopback-only',ALP_ENVIRONMENT:'v2-staging',ALP_STAGING_DATABASE_REF:'local-recovery-only',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:55321',NEXT_PUBLIC_SUPABASE_ANON_KEY:publicKey,SUPABASE_SERVICE_ROLE_KEY:serviceKey,NEXT_PUBLIC_APP_URL:'http://127.0.0.1:8961',ALP_EMAIL_MODE:'disabled',ALP_PAYMENTS_MODE:'disabled',SCANNEX_VIEWER_LAB_ENABLED:'false',PRIVATE_FILE_BUCKET:'course-review-evidence',CERTIFICATE_SIGNING_SECRET:randomBytes(32).toString('hex'),ALP_STRIPE_SETUP_KEY:randomBytes(32).toString('base64'),SECURITY_WATCHDOG_SIGNING_KEY:key,VERCEL_DEPLOYMENT_ID:'local-recovery-20261103',VERCEL_GIT_COMMIT_SHA:'recovery-adapter-reviewed-working-copy'};
const saved=JSON.stringify({publicKey,serviceKey});const dp="Add-Type -AssemblyName System.Security; $b=[Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd()); [Console]::Write([Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)))";
await writeFile(root+'/recovery-key-private/local-provider.dpapi',Buffer.from(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',dp],{input:saved,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}),'base64'));
console.log(JSON.stringify({starting:true,url:env.NEXT_PUBLIC_APP_URL,outbound:'Only local recovered provider permitted',transportAdapters:replaced,noCloudCredentialCopied:true}));
const child=spawn(process.execPath,[app+'/node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','8961'],{cwd:app,env,stdio:['ignore','inherit','inherit'],windowsHide:true});child.on('exit',code=>process.exitCode=code??1);
