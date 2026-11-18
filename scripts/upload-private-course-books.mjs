// Run with the existing V1 server environment injected in memory. Never print keys.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(base!=='https://ooujszdvncwijbuzpjfp.supabase.co'||!key){console.error('V1 server configuration is not available. No upload attempted.');process.exit(1);}
if(process.env.APGI_BOOK_UPLOAD_MODE==='check'){console.log('Verified V1 project and available server credential; no credential printed or written.');process.exit(0);}
const bucket='v1-scannex-course-books';
const headers={apikey:key,authorization:`Bearer ${key}`};
const info=await fetch(`${base}/storage/v1/bucket/${bucket}`,{headers});
if(!info.ok)throw Error('The private V1 book bucket must be provisioned first.');
if((await info.json()).public!==false)throw Error('Refusing to upload to a public bucket.');
const manifest=JSON.parse(await readFile('private/course-books/scannex/manifest.json','utf8'));
for(const book of manifest.resources){
 const bytes=await readFile(`private/course-books/scannex/${book.filename}`);
 if(createHash('sha256').update(bytes).digest('hex')!==book.sha256)throw Error(`Local integrity failure: ${book.id}`);
 const object=`${manifest.version}/${book.filename}`;
 const response=await fetch(`${base}/storage/v1/object/${bucket}/${object}`,{method:'POST',headers:{...headers,'content-type':'application/pdf','x-upsert':'false'},body:bytes});
 if(!response.ok&&response.status!==409){const status=await response.json().catch(()=>({}));if(status.statusCode!=='409')throw Error(`Upload failed for ${book.id}: HTTP ${response.status}`);}
 const check=await fetch(`${base}/storage/v1/object/authenticated/${bucket}/${object}`,{headers});
 if(!check.ok||createHash('sha256').update(Buffer.from(await check.arrayBuffer())).digest('hex')!==book.sha256)throw Error(`Stored integrity failure: ${book.id}`);
 console.log(`Verified private storage: ${book.id}`);
}
