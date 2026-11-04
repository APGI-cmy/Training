'use server';
import {revalidatePath} from 'next/cache';
import {requirePlatformPrincipal} from '@/server/services/platform-principals';
import {messageRpc} from '@/server/services/messages';
import {getCourseBySlug} from '@/lib/courses';
import {libraryImage} from '@/lib/email-image-library';
import {validId} from '@/lib/company-structure';
export type CourseImageState={error?:string;success?:string};
export async function saveCourseCardImage(_:CourseImageState,form:FormData):Promise<CourseImageState>{
 try{
  const {session}=await requirePlatformPrincipal();
  const course=getCourseBySlug(String(form.get('course')??''));if(!course)throw Error('Choose an available course.');
  const selection=String(form.get('image')??'').trim(),reset=form.get('operation')==='reset';
  const alt=String(form.get('alt')??'').trim();if(!reset&&(!alt||alt.length>250))throw Error('Add a short image description (up to 250 characters).');
  if(!reset&&!libraryImage(selection)&&!selection.match(/^[0-9a-f-]{36}$/i))throw Error('Select an image from the Image library.');
  await messageRpc('v3_course_card_image_save',{p_actor:session.user.id,p_course:course.id,p_image:!reset&&!libraryImage(selection)?validId(selection):null,p_shared:!reset&&libraryImage(selection)?selection:null,p_alt:reset?null:alt,p_reset:reset});
  for(const path of ['/admin/courses','/catalogue','/courses','/dashboard'])revalidatePath(path);
  revalidatePath('/company/[id]','page');
  return {success:reset?'Original course image restored.':'Course image saved. It is used on course cards throughout the platform.'};
 }catch(error){if(error instanceof Error&&'digest' in error)throw error;return {error:error instanceof Error?error.message:'Course image could not be saved. Please try again.'};}
}
