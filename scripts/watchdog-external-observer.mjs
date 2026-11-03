import {createHash,createPublicKey} from 'node:crypto';
import {pathToFileURL} from 'node:url';

// A read-only adapter for V2. Adding another application requires a reviewed
// adapter, not an arbitrary target URL supplied by a web request or environment.
export const observerOrigin='https://training-platform-v2-staging.vercel.app';
const project='prj_XaAAh2r1oRKGsi8HLxXGDzcI1yaf';
const trustedKey='MCowBQYDK2VwAyEA3LKXpik3eIt/9dYqLpJfOVRenkk5aUsirLKGyUESzEU=';
const privatePath='/courses/Executive%20Assistant%20Training%20Programme/LU1/course/index.html';
const definitions=[
 {id:'availability',path:'/api/security-watchdog/edge-control',method:'GET'},
 {id:'edge_denial',path:'/api/security-watchdog/edge-canary',method:'HEAD'},
 {id:'private_course',path:privatePath,method:'HEAD'},
 {id:'private_api',path:'/api/security-watchdog',method:'GET'},
 {id:'release_identity',path:'/api/course-deployment',method:'GET'},
 {id:'trusted_key',path:'/api/security-watchdog/keys',method:'GET'},
];
async function smallText(response){
 const reader=response.body?.getReader();if(!reader)return '';
 let size=0;const chunks=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>32768)throw Error('RESPONSE_TOO_LARGE');chunks.push(value);}}
 finally{await reader.cancel().catch(()=>{});}
 return Buffer.concat(chunks).toString('utf8');
}
function json(text){try{return JSON.parse(text);}catch{return null;}}
export async function observe({fetcher=fetch,now=()=>new Date(),timeoutMs=10000}={}){
 const startedAt=now().toISOString();
 const checks=await Promise.all(definitions.map(async d=>{
  const started=performance.now();let status=null;
  try{
   const response=await fetcher(observerOrigin+d.path,{method:d.method,redirect:'error',cache:'no-store',credentials:'omit',headers:{accept:d.id==='availability'?'text/plain':'application/json'},signal:AbortSignal.timeout(timeoutMs)});
   status=response.status;
   if(response.redirected||response.url&&new URL(response.url).origin!==observerOrigin)throw Error('UNEXPECTED_ORIGIN');
   let passed=false,metadata={};const noStore=/\bno-store\b/i.test(response.headers.get('cache-control')??'');
   if(d.id==='availability')passed=status===200&&noStore&&await smallText(response)==='APGI-WATCHDOG-EDGE-CONTROL';
   else if(d.id==='edge_denial')passed=status===403;
   else if(d.id==='private_course')passed=status===403&&noStore;
   else if(d.id==='private_api')passed=status===401&&noStore;
   else if(d.id==='release_identity'){
    const data=json(await smallText(response));
    passed=status===200&&noStore&&data?.version===1&&data.projectId===project&&/^dpl_[a-zA-Z0-9]+$/.test(data.deployment?.id??'')&&/^[a-f0-9]{40}$/.test(data.deployment?.commit??'')&&Object.values(data.courses??{}).length>0&&Object.values(data.courses).every(v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v));
    if(passed)metadata={deployment:data.deployment.id,commit:data.deployment.commit};
   }else if(d.id==='trusted_key'){
    const data=json(await smallText(response));
    const matches=data?.publicKey===trustedKey||Array.isArray(data?.verificationKeys)&&data.verificationKeys.some(k=>k.publicKey===trustedKey);
    passed=status===200&&noStore&&data?.algorithm==='Ed25519'&&matches===true;
    if(passed){createPublicKey({key:Buffer.from(trustedKey,'base64'),format:'der',type:'spki'});metadata={keyDigest:createHash('sha256').update(Buffer.from(trustedKey,'base64')).digest('hex')};}
   }
   await response.body?.cancel().catch(()=>{});
   return {id:d.id,state:passed?'passed':'failed',status,durationMs:Math.round(performance.now()-started),...metadata};
  }catch{return {id:d.id,state:'inconclusive',status,durationMs:Math.round(performance.now()-started)};}
 }));
 return {version:1,suite:'apgi-external-observer-v1',origin:observerOrigin,startedAt,finishedAt:now().toISOString(),checks,passed:checks.every(c=>c.state==='passed'),limitations:['Anonymous read-only external observations; no customer data, accounts or credentials.','Provider logs identify this observer run; this JSON is not an authenticated Watchdog receipt.','No claim of independent penetration testing, uninterrupted monitoring, private-route positive controls or ISO certification.']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=await observe();console.log(JSON.stringify(result));process.exitCode=result.passed?0:1;
}
