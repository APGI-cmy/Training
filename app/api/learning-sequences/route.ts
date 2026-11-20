import {NextRequest,NextResponse} from 'next/server';
import {getCurrentSession} from '@/server/auth/session';
import {getLearningCourse} from '@/server/services/course-editions';
import {getCourseAccess} from '@/lib/services/enrolments/get-course-access';
import {tigerUnitAllowed} from '@/server/services/tiger-progression';
import {adminRest} from '@/server/supabase/admin-rest';
import {sequenceRecordValid} from '@/lib/learning-sequence';
import {activityProfiles} from '@/lib/learning-sequence-dom';
import {decodedCoursePath} from '@/server/security/course-assets';

const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};
async function context(courseSlug:string,unitSlug:string){
 const session=await getCurrentSession();if(!session||!session.user.email_confirmed_at)return null;
 const course=await getLearningCourse(courseSlug),unit=course?.units.find(u=>u.slug===unitSlug);
 if(!course||!unit)return null;
 const access=await getCourseAccess({accessToken:session.accessToken,userId:session.user.id,userEmail:session.user.email,courseId:course.id});
 if(!access.canAccess||!await tigerUnitAllowed(session,course,unit))return null;
 return {session,course,unit,edition:course.editionId??'legacy'};
}
export async function GET(request:NextRequest){
 try{
  const c=await context(request.nextUrl.searchParams.get('courseSlug')??'',request.nextUrl.searchParams.get('unitSlug')??'');
  if(!c)return NextResponse.json({error:'Not authorised.'},{status:403,headers});
  const response=await adminRest(`/rest/v1/training_sequence_progress?user_id=eq.${c.session.user.id}&course_id=eq.${encodeURIComponent(c.course.id)}&edition_key=eq.${encodeURIComponent(c.edition)}&unit_id=eq.${encodeURIComponent(c.unit.id)}&select=document:document_path,profile,steps:step_count,begun,through:through_step,summary:summary_opened`);
  if(!response.ok)throw Error('Unavailable');
  return NextResponse.json({records:await response.json()},{headers});
 }catch{return NextResponse.json({error:'Activity progress could not be loaded. Please retry.'},{status:503,headers});}
}
export async function PUT(request:NextRequest){
 if(request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({error:'Not allowed.'},{status:403,headers});
 const body=await request.json().catch(()=>null);
 if(!body||!sequenceRecordValid(body.record)||!activityProfiles.some(p=>p.id===body.record.profile))return NextResponse.json({error:'Invalid activity progress.'},{status:400,headers});
 try{
  const c=await context(body.courseSlug??'',body.unitSlug??'');if(!c)return NextResponse.json({error:'Not authorised.'},{status:403,headers});
  const path=decodedCoursePath(body.record.document),base=decodeURIComponent(c.unit.assetBase).replace(/\/$/,'');
  if(!path||!path.startsWith(base+'/')||!path.endsWith('.html'))return NextResponse.json({error:'This activity does not belong to the learning unit.'},{status:400,headers});
  const r=body.record,response=await adminRest('/rest/v1/rpc/training_sequence_merge',{method:'POST',body:JSON.stringify({p_user:c.session.user.id,p_course:c.course.id,p_edition:c.edition,p_unit:c.unit.id,p_document:r.document,p_profile:r.profile,p_steps:r.steps,p_begun:r.begun,p_through:r.through,p_summary:r.summary})});
  if(!response.ok)return NextResponse.json({error:'Activity progress could not be saved. Keep this page open and retry.'},{status:503,headers});
  return NextResponse.json({record:await response.json()},{headers});
 }catch{return NextResponse.json({error:'Activity progress could not be saved. Keep this page open and retry.'},{status:503,headers});}
}
