import 'server-only';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {getSupabaseRestUrl} from '@/server/auth/session';
import {validId} from '@/lib/company-structure';

// Called only after the action verifies the administrator's company workspace.
export async function uploadEmailImage(company:string,file:FormDataEntryValue|null){
 validId(company);
 if(!file||typeof file==='string'||file.size===0)throw Error('Choose a PNG, JPEG or WebP image to import.');
 if(file.size>2*1024*1024)throw Error('Use an image no larger than 2 MB.');
 const bytes=Buffer.from(await file.arrayBuffer());
 const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const webp=bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
 if(!png&&!jpeg&&!webp)throw Error('Use a PNG, JPEG or WebP image.');
 let output:Buffer;
 try{output=await sharp(bytes,{limitInputPixels:25000000}).rotate().resize({width:1600,height:1200,fit:'inside',withoutEnlargement:true}).flatten({background:'#ffffff'}).jpeg({quality:85,mozjpeg:true}).toBuffer();}
 catch{throw Error('This image could not be opened. Choose a valid image up to 25 megapixels.');}
 if(output.length>2*1024*1024)throw Error('Choose a smaller image so the imported graphic stays under 2 MB.');
 const path=`${company}/${randomUUID()}.jpg`,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const url=getSupabaseRestUrl(`/storage/v1/object/email-message-images/${path}`);
 if(!url||!key)throw Error('Image storage is not configured.');
 const response=await fetch(url,{method:'POST',headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'image/jpeg','x-upsert':'false'},body:new Uint8Array(output),cache:'no-store'});
 if(!response.ok)throw Error('The image could not be imported. Please try again.');
 return {path,url:getSupabaseRestUrl(`/storage/v1/object/public/email-message-images/${path}`)!};
}
