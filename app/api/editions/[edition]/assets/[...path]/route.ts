import {providerFetch as fetch} from '@/server/security/provider-fetch';
import {getSupabaseRestUrl} from '@/server/auth/session';
import {editionAssetManifest} from '@/server/services/course-edition-assets';
import {validEditionPath,byteRange,segmentRanges} from '@/lib/course-editions';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{edition:string;path:string[]}>};
const privateHeaders={'cache-control':'private, no-store','vary':'Cookie','x-content-type-options':'nosniff'};
async function serve(request:Request,context:Context){
 const params=await context.params,path=validEditionPath(params.path);
 if(!path)return new Response('Course access required.',{status:403,headers:privateHeaders});
 const asset=await editionAssetManifest(params.edition,path);
 if(!asset)return new Response('This edition asset is not available to your account.',{status:403,headers:privateHeaders});
 const range=byteRange(request.headers.get('range'),asset.byte_count);
 if(!range)return new Response(null,{status:416,headers:{...privateHeaders,'content-range':`bytes */${asset.byte_count}`}});
 const headers=new Headers({...privateHeaders,'content-type':asset.content_type,'accept-ranges':'bytes','content-length':String(Math.max(0,range.end-range.start+1))});
 if(range.partial)headers.set('content-range',`bytes ${range.start}-${range.end}/${asset.byte_count}`);
 if(request.method==='HEAD')return new Response(null,{status:range.partial?206:200,headers});
 const requests=asset.byte_count?segmentRanges(asset.segments,range.start,range.end):[];
 async function* chunks(){for(const part of requests){
  const response=await fetch(getSupabaseRestUrl(`/storage/v1/object/course-edition-blocks/${part.block}`)!,{headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY!,authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,range:`bytes=${part.start}-${part.end}`},signal:request.signal});
  if(response.status!==206||response.headers.get('content-range')?.split('/')[0]!==`bytes ${part.start}-${part.end}`||!response.body)throw Error('Edition storage range verification failed');
  const reader=response.body.getReader();let count=0;try{while(true){const {done,value}=await reader.read();if(done)break;count+=value.length;if(count>part.end-part.start+1)throw Error('Edition asset exceeded manifest');yield value;}}finally{reader.releaseLock();}
  if(count!==part.end-part.start+1)throw Error('Incomplete edition asset');
 }}
 const iterator=chunks();
 const stream=new ReadableStream<Uint8Array>({async pull(controller){try{const next=await iterator.next();if(next.done)controller.close();else controller.enqueue(next.value);}catch(error){controller.error(error);}},async cancel(){await iterator.return(undefined);}});
 // SCORM and native web packages occasionally use absolute /courses links.
 // Keep those references in this edition instead of escaping into a draft.
 if(!range.partial&&/^(text\/|application\/(?:javascript|json|xml))/.test(asset.content_type)){
  const original=await new Response(stream).text();const rewritten=original.replaceAll('/courses/',`/api/editions/${params.edition}/assets/courses/`);
  headers.delete('content-length');return new Response(rewritten,{headers});
 }
 return new Response(stream,{status:range.partial?206:200,headers});
}
export async function GET(request:Request,context:Context){try{return await serve(request,context);}catch{return new Response('The edition asset is temporarily unavailable.',{status:503,headers:privateHeaders});}}
export async function HEAD(request:Request,context:Context){return GET(request,context);}
