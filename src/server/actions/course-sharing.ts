'use server';
import {revalidatePath} from 'next/cache';
import {requireSession} from '@/server/auth/session';
import {offerCourse,decideDistribution} from '@/server/services/course-distribution';
import {formText,type StructureState} from '@/lib/company-structure';
import {requireCourseSharingOwner} from '@/server/services/course-sharing';
import {refreshRegisteredCourseShares} from '@/server/services/course-exchange';
export async function courseSharingAction(_:StructureState,form:FormData):Promise<StructureState>{
 try{
  const session=await requireSession();
  if(form.get('confirm_owner')!=='on')throw Error('Confirm this course-owner sharing decision.');
  const decision=formText(form,'decision');
  if(decision!=='share')throw Error('Use the three-notice workflow to withdraw a course.');
  await offerCourse({course:formText(form,'course_id'),owner:formText(form,'owner_id'),recipient:formText(form,'recipient_id'),reason:formText(form,'reason',10,2000)},session);
  for(const path of ['/course-sharing','/admin/courses','/catalogue','/course-reviews','/company'])revalidatePath(path,'layout');
  return {success:'Published course offered to the receiving owner’s private shelf. Their explicit acceptance is required before portfolio publication. A message and email are queued for delivery.'};
 }catch(error){if(error instanceof Error&&'digest' in error)throw error;return {error:error instanceof Error?error.message:'The sharing decision could not be saved.'};}
}
export async function distributionDecisionAction(_:StructureState,form:FormData):Promise<StructureState>{
 try{
  const session=await requireSession();if(form.get('confirm_owner')!=='on')throw Error('Confirm this platform-owner decision.');
  const action=formText(form,'decision');
  if(!['accept','decline','margin','concern','final','withdrawn','resolve'].includes(action))throw Error('Choose a recorded sharing action.');
  await decideDistribution({id:formText(form,'distribution'),company:formText(form,'company'),action,reason:formText(form,'reason',10,2000),revision:Number(form.get('revision')),days:Number(form.get('days')??7),margin:Math.round(Number(form.get('margin_percent')??100)*100)},session);
  for(const p of ['/course-sharing','/catalogue','/admin/courses','/course-reviews','/messages'])revalidatePath(p);
  return {success:'Sharing decision recorded. Its message and tracked email are queued. Existing enrolments and live-payment settings remain unchanged.'};
 }catch(e){if(e instanceof Error&&'digest' in e)throw e;return {error:e instanceof Error?e.message:'The sharing decision could not be saved.'};}
}
export async function refreshCourseShares(_:StructureState,form:FormData):Promise<StructureState>{try{
 const session=await requireSession();await requireCourseSharingOwner(formText(form,'company'),session);
 const result=await refreshRegisteredCourseShares();revalidatePath('/course-sharing');
 return {success:`Shared-course metadata checked on common version ${result.version}. No learner records or passwords were exchanged.`};
}catch(e){if(e instanceof Error&&'digest' in e)throw e;return {error:e instanceof Error?e.message:'Course exchange awaits retry.'};}}
