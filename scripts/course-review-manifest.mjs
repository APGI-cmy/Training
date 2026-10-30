import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {deliveryCourses,buildCourseIdentity} from './course-content-identity.mjs';
// Build-time fingerprints cover the delivered packages, not just course labels.
async function digestTree(root) {
 const hash=createHash('sha256'),entries=[]; let count=0;
 async function walk(dir){for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const path=join(dir,entry.name);if(entry.isDirectory())await walk(path);else if(entry.isFile()){const name=relative(root,path).replaceAll('\\','/'),fileHash=createHash('sha256');hash.update(name+'\0');for await(const bytes of createReadStream(path)){hash.update(bytes);fileHash.update(bytes);}entries.push({path:name,sha256:fileHash.digest('hex')});count++;}else throw Error('Course asset links are not supported');}}
 await walk(root);return {sha256:hash.digest('hex'),files:count,entries};
}
const roots={'vpshr-level-0':'vpshr-level-0','scannex-training-programme':'Scannex Training Programme','tiger-kidnapping-telecommunications':'Tiger kidnapping_telecommunications','executive-assistant-lu1-compatibility':'Executive Assistant Training Programme'};
const content={},entries={};for(const [slug,folder] of Object.entries(roots)){const tree=await digestTree(join(process.cwd(),'public','courses',folder));content[slug]={sha256:tree.sha256,files:tree.files};entries[slug]=tree.entries;}
// Catalogue objects are already included in each review's own fingerprint.
// Keep the shared engine independent of course additions. The compatibility
// entry preserves existing review identities across this registry-only split.
const sources=createHash('sha256');for(const file of ['src/lib/courses.ts','src/components/course/ScormPlayer.tsx','src/components/QuizEngine.tsx','src/components/assessments/ScannexTheoryAssessment.tsx','src/server/assessments/scannex-theory-bank.ts','src/lib/services/courses/get-unit-content.ts'])sources.update((await readFile(file,'utf8')).replaceAll('\r\n','\n'));
const engine=sources.digest('hex'),compatibility=JSON.parse(await readFile('src/data/course-review-engine-compatibility.json','utf8'));
const source=engine===compatibility.engine?compatibility.legacySource:engine;
await writeFile('src/data/course-review-manifest.json',JSON.stringify({...content,source}));
const identities={};for(const course of deliveryCourses()){if(!content[course.slug])throw Error('Course identity root is missing');identities[course.id]=buildCourseIdentity(course,content[course.slug],source,entries[course.slug]);}
await writeFile('src/data/course-content-identities.json',JSON.stringify({version:1,courses:identities}));
console.log(`Review manifests verified for ${Object.keys(content).length} courses.`);

// Keep resource discovery separate so a review-UI repair does not change content identity.
const ebooks=[];
async function books(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await books(path);else if(entry.name==='book.pdf')ebooks.push('/'+relative(join(process.cwd(),'public'),path).replaceAll('\\','/').split('/').map(encodeURIComponent).join('/'));}}
await books(join(process.cwd(),'public','courses'));
await writeFile('src/data/course-review-resources.json',JSON.stringify({ebooks:ebooks.sort()}));
