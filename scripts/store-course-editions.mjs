import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readdir,readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,relative,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {deliveryCourses} from './course-content-identity.mjs';

// Run from the source repository, with --env-file outside OneDrive and a
// task-specific --work directory. Nothing in public/ or a prior edition is edited.
const arg=name=>process.argv.find(a=>a.startsWith(name+'='))?.slice(name.length+1);
const work=arg('--work');if(!work||!resolve(work).startsWith('C:\\Users\\Johan\\Codex-Work\\'))throw Error('Use an external Codex-Work directory.');
const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(base!=='https://eaaqgtdpvbxdgjxphjie.supabase.co'||!key)throw Error('Only the configured V2 project may be used.');
const root=process.cwd(),commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const selected=arg('--course'),courses=deliveryCourses().filter(c=>!selected||c.id===selected);if(!courses.length)throw Error('Unknown course');
await mkdir(work,{recursive:true});await mkdir(join(work,'blocks'),{recursive:true});
async function api(path,init={}){const r=await fetch(base+path,{...init,headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json',...init.headers},signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error(`Storage/import request failed ${r.status} ${path.split('?')[0]}`);return r;}
const rest=async(path,init={})=>(await api('/rest/v1/'+path,init)).json();
const ledgerPath=join(work,'verified-blocks.json');let verified={};try{verified=JSON.parse(await readFile(ledgerPath,'utf8'));}catch{}
const dirty=execFileSync('git',['diff','--name-only','--','public/courses'],{encoding:'utf8'}).trim().split('\n').filter(Boolean).map(p=>p.replaceAll('"',''));
// Preserve the nine known EOL-only working changes; snapshot the committed bytes.
const overrides=new Map();for(const file of dirty){if(!file.startsWith('public/courses/vpshr-level-0/LU1 Definition/')||!file.endsWith('.js')&&!file.endsWith('.html'))throw Error('Uncommitted course content requires an explicit import decision');const bytes=execFileSync('git',['show',`HEAD:${file}`],{maxBuffer:20*1024*1024});const actual=await readFile(file);if(actual.toString().replaceAll('\r\n','\n')!==bytes.toString().replaceAll('\r\n','\n'))throw Error('A dirty file has substantive changes');overrides.set(resolve(file),bytes);}
const manifests=[];
if(arg('--resume')==='1')manifests.push(...JSON.parse(await readFile(join(work,'manifests.json'),'utf8')));
else for(const course of courses){
 const tree=resolve('public',decodeURIComponent(course.sourceRoot).slice(1));const files=[];
 async function walk(dir){for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const path=join(dir,entry.name);if(entry.isDirectory())await walk(path);else if(entry.isFile())files.push(path);else throw Error('Course links are not supported');}}await walk(tree);
 let buffer=Buffer.alloc(16777216),used=0,blockIndex=0;const blocks=[],assets=[];
 async function flush(){if(!used)return;const bytes=buffer.subarray(0,used),hash=createHash('sha256').update(bytes).digest('hex');await writeFile(join(work,'blocks',hash),bytes);blocks.push({hash,size:used});blockIndex++;used=0;buffer=Buffer.alloc(16777216);}
 for(const file of files){const hash=createHash('sha256'),segments=[];let size=0;const input=overrides.has(resolve(file))?[overrides.get(resolve(file))]:createReadStream(file);
  for await(const bytes of input){hash.update(bytes);size+=bytes.length;let at=0;while(at<bytes.length){const length=Math.min(bytes.length-at,buffer.length-used);bytes.copy(buffer,used,at,at+length);segments.push({index:blockIndex,offset:used,length});used+=length;at+=length;if(used===buffer.length)await flush();}}
  const path='/'+relative(resolve('public'),file).replaceAll('\\','/');
  const ext=path.split('.').pop().toLowerCase(),types={html:'text/html; charset=utf-8',htm:'text/html; charset=utf-8',js:'application/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json',xml:'application/xml',svg:'image/svg+xml',pdf:'application/pdf',mp4:'video/mp4',mp3:'audio/mpeg',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',vtt:'text/vtt; charset=utf-8',txt:'text/plain; charset=utf-8'};
  assets.push({path,byte_count:size,content_hash:hash.digest('hex'),content_type:types[ext]??'application/octet-stream',segments});
 }await flush();
 for(const asset of assets)asset.segments=asset.segments.map(s=>({block:blocks[s.index].hash,offset:s.offset,length:s.length}));
 const contentHash=createHash('sha256').update(JSON.stringify({course,assets})).digest('hex');
 manifests.push({course,assets,blocks,contentHash});
 console.log(JSON.stringify({packed:course.id,files:assets.length,blocks:blocks.length,bytes:assets.reduce((n,a)=>n+a.byte_count,0)}));
}
await writeFile(join(work,'manifests.json'),JSON.stringify(manifests));
const blocks=[...new Map(manifests.flatMap(m=>m.blocks).map(b=>[b.hash,b])).values()];let cursor=0,finished=0;
let ledgerWrite=Promise.resolve();
const storageOrigin='https://eaaqgtdpvbxdgjxphjie.storage.supabase.co';
async function resumable(block,bytes){
 const headers={apikey:key,authorization:`Bearer ${key}`,'Tus-Resumable':'1.0.0','x-upsert':'false'};
 const metadata=Object.entries({bucketName:'course-edition-blocks',objectName:block.hash,contentType:'application/octet-stream',cacheControl:'0'}).map(([k,v])=>k+' '+Buffer.from(v).toString('base64')).join(',');
 const create=await fetch(storageOrigin+'/storage/v1/upload/resumable',{method:'POST',headers:{...headers,'Upload-Length':String(bytes.length),'Upload-Metadata':metadata},signal:AbortSignal.timeout(120000),redirect:'error'});
 if(!create.ok)throw Error(`Resumable creation failed ${create.status}`);
 const url=new URL(create.headers.get('location'),storageOrigin);if(url.origin!==storageOrigin||!url.pathname.startsWith('/storage/v1/upload/resumable/'))throw Error('Unexpected upload destination');
 for(let offset=0;offset<bytes.length;offset+=6291456){const end=Math.min(bytes.length,offset+6291456);const part=await fetch(url,{method:'PATCH',headers:{...headers,'Upload-Offset':String(offset),'content-type':'application/offset+octet-stream'},body:bytes.subarray(offset,end),signal:AbortSignal.timeout(120000),redirect:'error'});if(part.status===409)return;if(part.status!==204||Number(part.headers.get('upload-offset'))!==end)throw Error(`Resumable segment failed ${part.status}`);}
}
await Promise.all(Array.from({length:3},async()=>{while(cursor<blocks.length){const b=blocks[cursor++];if(verified[b.hash]===b.size){finished++;continue;}
 const bytes=await readFile(join(work,'blocks',b.hash));
 let done=false;for(let attempt=0;attempt<3&&!done;attempt++){try{
  const exists=await fetch(`${base}/storage/v1/object/course-edition-blocks/${b.hash}`,{method:'HEAD',headers:{apikey:key,authorization:`Bearer ${key}`},signal:AbortSignal.timeout(120000),redirect:'error'});
  if(exists.status===404||exists.status===400)await resumable(b,bytes);else if(!exists.ok)throw Error(`Storage object check failed ${exists.status}`);
  const download=await api(`/storage/v1/object/course-edition-blocks/${b.hash}`);const digest=createHash('sha256');let length=0;for await(const part of download.body){digest.update(part);length+=part.length;}
  if(length!==b.size||digest.digest('hex')!==b.hash)throw Error('Storage readback mismatch');
  verified[b.hash]=b.size;ledgerWrite=ledgerWrite.then(()=>writeFile(ledgerPath,JSON.stringify(verified)));await ledgerWrite;done=true;
 }catch(error){if(attempt===2||String(error).includes('failed 403'))throw error;}}
 finished++;if(finished%10===0||finished===blocks.length)console.log(JSON.stringify({verifiedBlocks:finished,totalBlocks:blocks.length}));
}}));
for(const m of manifests){
 const previous=await rest(`course_editions?course_id=eq.${m.course.id}&select=id,content_hash,edition_number,runtime_course_id,state&order=edition_number.desc`);
 let edition=previous.find(e=>e.content_hash===m.contentHash);const number=edition?.edition_number??(previous[0]?.edition_number??0)+1;
 const runtime=number===1?m.course.id:`${m.course.id}--edition-${number}`,slug=number===1?m.course.slug:`${m.course.slug}--edition-${number}`;
 const document=JSON.parse(JSON.stringify(m.course));document.baseCourseId=m.course.id;document.id=runtime;document.slug=slug;
 for(const unit of document.units){const path=decodeURIComponent(unit.assetBase)+'/data/book.pdf';if(m.assets.some(a=>a.path===path))unit.ebookPath=path;}
 if(number>1)document.units=document.units.map(u=>({...u,id:`${u.id}--edition-${number}`}));
 if(!edition){
  if(number>1){await api('/rest/v1/courses',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({id:runtime,slug,title:m.course.title,level:m.course.level,description:m.course.description,audience:m.course.audience,duration:m.course.duration,source_root:m.course.sourceRoot,status:'draft'})});
   await api('/rest/v1/course_modules',{method:'POST',body:JSON.stringify(document.units.map(u=>({id:u.id,course_id:runtime,slug:u.slug,title:u.title,display_order:u.order})))});}
  [edition]=await rest('course_editions',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({course_id:m.course.id,runtime_course_id:runtime,runtime_slug:slug,edition_number:number,content_hash:m.contentHash,course_document:document,source_commit:commit,file_count:m.assets.length,byte_count:m.assets.reduce((n,a)=>n+a.byte_count,0)})});
 }
 if(edition.state==='staging')for(let i=0;i<m.assets.length;i+=150)await api('/rest/v1/course_edition_assets?on_conflict=edition_id,path',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify(m.assets.slice(i,i+150).map(a=>({...a,edition_id:edition.id})))});
 await api('/rest/v1/rpc/v3_finish_course_edition',{method:'POST',body:JSON.stringify({p_edition:edition.id,p_baseline:number===1})});
 console.log(JSON.stringify({registered:m.course.id,editionId:edition.id,edition:number,baseline:number===1,readbackVerified:true}));
}
await writeFile(join(work,'complete.json'),JSON.stringify({completedAt:new Date().toISOString(),sourceCommit:commit,blocks:blocks.length,verifiedBytes:blocks.reduce((n,b)=>n+b.size,0),courses:manifests.map(m=>({id:m.course.id,hash:m.contentHash,files:m.assets.length}))},null,2));
