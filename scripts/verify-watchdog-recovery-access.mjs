import {createServer} from 'node:net';
import {randomUUID,randomBytes,createHmac} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
const ref='guoarsqxmjeqheqsnczg',origin=`https://${ref}.supabase.co`,pipe=process.argv[2];
if(!/^\\\\\.\\pipe\\apgi-recovery-[a-f0-9-]{36}$/.test(pipe??''))throw Error('Recovery credential pipe required');
const runId=randomUUID(),users=[],companies=[randomUUID(),randomUUID()],checks=[];
let keys,actualRun,seeded=false,cleanup=false;
function valid(k,role){try{const c=JSON.parse(Buffer.from(k.split('.')[1],'base64url'));return c.ref===ref&&c.role===role;}catch{return false;}}
function credentials(){return new Promise((done,fail)=>{const server=createServer(s=>{let data='';s.on('data',b=>{data+=b;if(data.length>16384)s.destroy();});s.on('end',()=>{server.close();clearTimeout(timer);try{const k=JSON.parse(data);if(!valid(k.service,'service_role')||!valid(k.anon,'anon'))throw Error();done(k);}catch{fail(Error('Recovery credential rejected'));}});});const timer=setTimeout(()=>{server.close();fail(Error('Recovery credential timeout'));},300000);server.on('error',()=>{clearTimeout(timer);fail(Error('Local credential channel unavailable'));});server.listen({path:pipe,readableAll:false,writableAll:false},()=>console.log('{"ready":true}'));});}
async function call(path,{method='GET',body,token,service=false,headers:extra={}}={}){
 if(!/^\/(auth|rest|storage)\/v1\//.test(path)||path.includes('..'))throw Error('Recovery request rejected');
 const key=service?keys.service:keys.anon;
 return fetch(origin+path,{method,headers:{apikey:key,...(service||token?{authorization:'Bearer '+(token??key)}:{}),'content-type':'application/json',...extra},body:body===undefined?undefined:typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
}
async function json(r){if(!r.ok)throw Error('Recovery provider request failed: '+r.status);return r.status===204?null:r.json();}
const rpc=(name,body)=>call('/rest/v1/rpc/'+name,{service:true,method:'POST',body}).then(json);
async function check(id,test){try{const ok=await test();checks.push({id,state:ok?'passed':'failed'});return ok;}catch{checks.push({id,state:'inconclusive'});return false;}}
function totp(secret){let bits='';for(const c of secret.replace(/=+$/,''))bits+='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c.toUpperCase()).toString(2).padStart(5,'0');const key=Buffer.from((bits.match(/.{8}/g)??[]).map(s=>parseInt(s,2))),clock=Buffer.alloc(8);clock.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const d=createHmac('sha1',key).update(clock).digest();return String((d.readUInt32BE(d[19]&15)&0x7fffffff)%1000000).padStart(6,'0');}
async function stepUp(user){
 const factor=await json(await call('/auth/v1/factors',{method:'POST',token:user.token,body:{factor_type:'totp',friendly_name:'Disposable recovery drill',issuer:'APGI recovery synthetic'}}));
 const challenge=await json(await call('/auth/v1/factors/'+factor.id+'/challenge',{method:'POST',token:user.token,body:{}}));
 const result=await json(await call('/auth/v1/factors/'+factor.id+'/verify',{method:'POST',token:user.token,body:{challenge_id:challenge.id,code:totp(factor.totp.secret)}}));
 if(result.user?.id!==user.id||JSON.parse(Buffer.from(result.access_token.split('.')[1],'base64url')).aal!=='aal2')throw Error('Synthetic MFA check failed');user.token=result.access_token;
 return (await json(await call('/auth/v1/user',{token:user.token}))).id===user.id;
}
const read=(u,path)=>call('/rest/v1/'+path,{token:u.token}).then(json);
const startedAt=new Date().toISOString();
try{
 keys=await credentials();
 const principal=(await json(await call('/rest/v1/platform_principals?select=user_id&email=eq.johan.ras%40apginc.ca',{service:true})))[0]?.user_id;
 if(!principal)throw Error('Recovery principal unavailable');
 const run=await rpc('v2_watchdog_start',{p_actor:principal,p_company:null,p_request:runId,p_deployment:'isolated-recovery-drill'});
 // The database allocates the run ID independently of the request key.
 actualRun=run.id;if(!/^[a-f0-9-]{36}$/.test(actualRun))throw Error('Recovery run unavailable');
 for(let i=1;i<=3;i++){
  const email=`watchdog-${actualRun}-${i}@example.invalid`,password=randomBytes(36).toString('base64url');
  const u=await json(await call('/auth/v1/admin/users',{service:true,method:'POST',body:{email,password,email_confirm:true,app_metadata:{watchdog_fixture:true,watchdog_run:actualRun}}}));
  if(!u.id||u.app_metadata?.watchdog_run!==actualRun)throw Error('Synthetic user mismatch');users.push({id:u.id,run:actualRun});
  const s=await json(await call('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}}));if(s.user?.id!==u.id)throw Error('Synthetic sign-in mismatch');users.at(-1).token=s.access_token;
 }
 await rpc('v2_watchdog_seed',{p_run:actualRun,p_users:users.map(u=>u.id),p_companies:companies});seeded=true;
 const [a,b,c]=users;
 await check('restored_config',async()=>{const cfg=await rpc('v2_watchdog_configuration',{p_actor:principal,p_company:null});return cfg.allPublicTablesRls===true&&cfg.clientDestructiveGrantsPresent===false&&cfg.watchdogRecordsServerOnly===true&&cfg.privateEvidenceBucket===true;});
 await check('aal1_owner_denied',async()=>{const r=await call('/rest/v1/profiles?user_id=eq.'+a.id+'&select=user_id',{token:a.token});return r.status===403||r.ok&&(await r.json()).length===0;});
 const mfa=await check('restored_mfa_aal2',()=>stepUp(a));
 await check('foreign_owner_mfa',()=>stepUp(b));
 if(mfa){
  const own=await check('own_profile',async()=>(await read(a,'profiles?user_id=eq.'+a.id+'&select=user_id')).length===1);
  if(own){await check('same_company_profile_denied',async()=>(await read(a,'profiles?user_id=eq.'+c.id+'&select=user_id')).length===0);await check('other_company_profile_denied',async()=>(await read(a,'profiles?user_id=eq.'+b.id+'&select=user_id')).length===0);}
  const member=await check('own_membership',async()=>(await read(a,'organisation_memberships?organisation_id=eq.'+companies[0]+'&user_id=eq.'+a.id+'&select=user_id')).length===1);
  if(member)await check('other_company_membership_denied',async()=>(await read(a,'organisation_memberships?organisation_id=eq.'+companies[1]+'&user_id=eq.'+b.id+'&select=user_id')).length===0);
  const ownCanary=await check('own_record',async()=>(await read(a,'v2_watchdog_canaries?run_id=eq.'+actualRun+'&owner_id=eq.'+a.id+'&select=id')).length===1);
  if(ownCanary){await check('same_company_record_denied',async()=>(await read(a,'v2_watchdog_canaries?run_id=eq.'+actualRun+'&owner_id=eq.'+c.id+'&select=id')).length===0);await check('other_company_record_denied',async()=>(await read(a,'v2_watchdog_canaries?run_id=eq.'+actualRun+'&owner_id=eq.'+b.id+'&select=id')).length===0);}
  for(const table of ['course_review_rounds','v2_message_threads','v2_stripe_orders','v2_email_outbox','v2_stripe_personal_accounts','v2_watchdog_runs'])await check('server_only_'+table,async()=>{const positive=await call('/rest/v1/'+table+'?select=*&limit=0',{service:true});if(!positive.ok)throw Error('Positive endpoint unavailable');const negative=await call('/rest/v1/'+table+'?select=*&limit=0',{token:a.token});return [401,403].includes(negative.status);});
 }
 await check('anonymous_record_denied',async()=>[401,403].includes((await call('/rest/v1/v2_watchdog_canaries?select=id&limit=0')).status));
 await check('logout_revokes_session',async()=>{const claims=JSON.parse(Buffer.from(c.token.split('.')[1],'base64url'));await json(await call('/auth/v1/logout?scope=global',{method:'POST',token:c.token}));const result=await rpc('v2_security_session_status',{p_actor:c.id,p_session:claims.session_id});return result.active===false;});
}catch{checks.push({id:'runner',state:'inconclusive'});}
finally{
 if(keys){
  let safe=true;
  for(const u of users){try{await call('/auth/v1/logout?scope=global',{method:'POST',token:u.token});}catch{}}
  if(seeded&&actualRun)try{await rpc('v2_watchdog_clean_fixtures',{p_run:actualRun});}catch{safe=false;}
  for(const u of users)try{const actual=await json(await call('/auth/v1/admin/users/'+u.id,{service:true}));if(actual.app_metadata?.watchdog_run!==u.run)throw Error('Synthetic cleanup guard');await json(await call('/auth/v1/admin/users/'+u.id,{service:true,method:'DELETE',body:{should_soft_delete:false}}));}catch{safe=false;}
  if(actualRun)try{await json(await call('/rest/v1/v2_watchdog_runs?id=eq.'+actualRun,{service:true,method:'PATCH',body:{state:safe?'finished':'cleanup_pending',fixtures_cleaned:safe,finished_at:new Date().toISOString()}}));}catch{safe=false;}
  cleanup=safe;
 }
 checks.push({id:'cleanup',state:cleanup?'passed':'failed'});
 const receipt={version:1,target:ref,startedAt,finishedAt:new Date().toISOString(),checks,cleanup,passed:checks.length>=20&&checks.every(c=>c.state==='passed'),limitations:['Tests target only the explicitly approved isolated recovery project.','Synthetic identities exercise restored Auth, MFA, session revocation and direct database boundaries; no application or integrations are repointed to the recovery environment.','No independent human security review or full application disaster-recovery acceptance is asserted.']};
 const bytes=JSON.stringify(receipt,null,2),root='C:/Users/Johan/Codex-Work/watchdog-recovery-20261103/';
 await writeFile(root+'recovery-boundary-'+(actualRun??runId)+'.json',bytes,{flag:'wx'});
 try{await writeFile(root+'recovery-boundary-receipt.json',bytes,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}
 console.log(JSON.stringify(receipt));if(!receipt.passed)process.exitCode=1;
}
