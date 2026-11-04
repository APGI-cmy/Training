import 'server-only';
import {cache} from 'react';
import {adminRest} from '@/server/supabase/admin-rest';
import {getSupabaseRestUrl} from '@/server/auth/session';
import {libraryImagePath} from '@/lib/email-image-library';
import {messageRpc} from '@/server/services/messages';
import {requirePlatformPrincipal} from '@/server/services/platform-principals';
import type {EmailWorkspace,EmailLibraryImage} from '@/lib/email-sets';
export type CourseCardImage={src:string;alt:string;selection:string};
export const getSavedCourseCardImages=cache(async():Promise<Record<string,CourseCardImage>>=>{
 try{
  const response=await adminRest('/rest/v1/v3_course_card_images?select=course_id,image_id,shared_image,alt_text,image:v2_image_library(object_path)');
  if(!response.ok)return {};
  const images:Record<string,CourseCardImage>={};
  for(const row of await response.json() as {course_id:string;image_id:string|null;shared_image:string|null;alt_text:string;image:{object_path:string}|null}[]){
   const src=row.shared_image?libraryImagePath(row.shared_image):row.image?getSupabaseRestUrl(`/storage/v1/object/public/email-message-images/${row.image.object_path}`):null;
   if(src)images[row.course_id]={src,alt:row.alt_text,selection:row.shared_image??row.image_id!};
  }
  return images;
 }catch{return {};}
});
export async function courseCardImageWorkspace(){
 const {session}=await requirePlatformPrincipal();
 const workspace=await messageRpc<EmailWorkspace>('v2_email_workspace',{p_actor:session.user.id});
 const images=await messageRpc<EmailLibraryImage[]>('v2_image_library_list',{p_actor:session.user.id});
 return {companies:workspace.companies.map(c=>({id:c.id,name:c.name})),images:images.filter(i=>i.purpose!=='email').map(i=>({...i,url:getSupabaseRestUrl(`/storage/v1/object/public/email-message-images/${i.object_path}`)!}))};
}
