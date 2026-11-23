import {NextRequest,NextResponse} from 'next/server';
import {requireLearningSession,learningSessionResponse} from '@/server/auth/learning-session';
import {getLearningCourse} from '@/server/services/course-editions';
import {getCourseAccess} from '@/lib/services/enrolments/get-course-access';
import {tigerPolicy,TIGER_POLICY_VERSION} from '@/lib/tiger-progression';
import {saveTigerEvidence,tigerUnitAllowed} from '@/server/services/tiger-progression';

export const dynamic='force-dynamic';
async function context(courseSlug:string,unitSlug:string,expectedLearnerId?:unknown){
  const session=await requireLearningSession(expectedLearnerId);
  const course=await getLearningCourse(courseSlug,session),unit=course?.units.find(u=>u.slug===unitSlug);
  if(!course||!unit||!tigerPolicy(course,unit))return null;
  const access=await getCourseAccess({accessToken:session.accessToken,userId:session.user.id,userEmail:session.user.email,courseId:course.id});
  if(!access.canAccess||!await tigerUnitAllowed(session,course,unit))return null;
  return {session,course,unit};
}
export async function GET(request:NextRequest){
  try{
    const resolved=await context(request.nextUrl.searchParams.get('courseSlug')??'',request.nextUrl.searchParams.get('unitSlug')??'');
    if(!resolved)return NextResponse.json({error:'Course requirements are not available.'},{status:403});
    const {state,qualified}=await saveTigerEvidence(resolved.session,resolved.course,resolved.unit,{});
    return NextResponse.json({state,qualified,version:TIGER_POLICY_VERSION,edition:resolved.course.editionId??'legacy'},{headers:{'cache-control':'private, no-store'}});
  }catch(error){return learningSessionResponse(error)??NextResponse.json({error:'Your saved requirements could not be loaded. Please try again.'},{status:503});}
}
export async function PUT(request:NextRequest){
  if(request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({error:'Not allowed'},{status:403});
  if(Number(request.headers.get('content-length')??0)>20000)return NextResponse.json({error:'Request too large'},{status:413});
  try{
    const body=await request.json();
    if(!body||body.version!==TIGER_POLICY_VERSION)return NextResponse.json({error:'Reload this course edition.'},{status:409});
    const resolved=await context(body.courseSlug,body.unitSlug,body.expectedLearnerId);
    if(!resolved||body.edition!==(resolved.course.editionId??'legacy'))return NextResponse.json({error:'Course requirements are not available.'},{status:403});
    // Quiz pass comes only through the SCORM processing route, never this evidence endpoint.
    const result=await saveTigerEvidence(resolved.session,resolved.course,resolved.unit,{ranges:body.ranges,summary:body.summary});
    return NextResponse.json(result,{headers:{'cache-control':'private, no-store'}});
  }catch(error){return learningSessionResponse(error)??NextResponse.json({error:'The activity progress could not be saved. Please retry without leaving this page.'},{status:409});}
}
