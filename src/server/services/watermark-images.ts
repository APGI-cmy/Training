import 'server-only';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {adminRest} from '@/server/supabase/admin-rest';
import {validId} from '@/lib/company-structure';
import {watermark,watermarkFromForm,type Watermark} from '@/lib/watermarks';
// Caller must authorise this company before upload; only a newly generated path is accepted.
export async function watermarkSettings(form:FormData,prefix:string,organisationId:string,current:Watermark,hasLogo:boolean){
 validId(organisationId);const prior=watermark(current),file=form.get(`${prefix}_image`);
 let imagePath=prior.imagePath?.startsWith(`organisations/${organisationId}/watermarks/`)?prior.imagePath:undefined;
 if(file instanceof File&&file.size){
  if(file.size>2*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Use a PNG, JPEG or WebP watermark image up to 2 MB.');
  const image=sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:16_000_000});
  if(!['png','jpeg','webp'].includes((await image.metadata()).format??''))throw Error('The file must contain a PNG, JPEG or WebP image.');
  let bytes=await image.resize({width:1000,height:1000,fit:'inside',withoutEnlargement:true}).png({compressionLevel:9}).toBuffer();
  // The existing branding bucket is limited to 2 MB, including the normalised PNG.
  if(bytes.length>2*1024*1024)bytes=await image.resize({width:700,height:700,fit:'inside',withoutEnlargement:true}).png({compressionLevel:9}).toBuffer();
  if(bytes.length>2*1024*1024)throw Error('Use a smaller watermark image.');
  imagePath=`organisations/${organisationId}/watermarks/${randomUUID()}.png`;
  const response=await adminRest(`/storage/v1/object/alp-branding-assets/${imagePath}`,{method:'POST',headers:{'content-type':'image/png'},body:new Uint8Array(bytes)});
  if(!response.ok)throw Error('The watermark image could not be uploaded. Your saved settings remain unchanged.');
 }
 return watermarkFromForm(form,prefix,hasLogo,imagePath);
}
