import {providerFetch as fetch} from '@/server/security/provider-fetch';
import 'server-only';
import {courses} from '@/lib/course-catalogue';
import {getCourseCover} from '@/lib/course-covers';
import {assertStagingIsolation,STAGING_DATABASE_REF,configuredDatabaseRef} from '@/server/environment-isolation';
import {tenantCourseAssigned} from '@/server/services/tenant-courses';
import {productionCompanyId} from '@/server/services/tenant-courses';

// Match decoded path segments, never file extensions: videos, scripts and PDFs
// must have the same access boundary as the presentation that references them.
export function decodedCoursePath(path:string):string|null {
 try {
  const decoded=decodeURIComponent(path);
  if(!decoded.startsWith('/courses/')||/[\\\u0000-\u001f\u007f%?#]/.test(decoded)||decoded.slice(1).split('/').some(p=>p==='.'||p==='..'||p===''))return null;
  return decoded;
 }catch{return null;}
}
export function courseAssetTarget(path:string):{courseId:string;publicCover:boolean;unit?:number}|null {
 const decoded=decodedCoursePath(path);if(!decoded)return {courseId:'',publicCover:false};
 // These exact extensionless paths are application pages, whose DAL already
 // checks access. Physical course files live below the registered roots.
 if(/^\/courses\/(?:vpshr-level-0(?:\/(?:introduction|lu\d+|unit\d+))?|scannex-training-programme)$/.test(decoded))return null;
 for(const course of courses){
  const root=decodeURIComponent(course.sourceRoot);
  if(decoded===root||decoded.startsWith(root+'/')){const unit=course.id==='tiger-kidnapping-telecommunications'?/^\/LU([1-8])(?:\/|$)/.exec(decoded.slice(root.length)):null;return {courseId:course.id,publicCover:decoded===decodeURIComponent(getCourseCover(course.slug)?.src??''),...(unit?{unit:Number(unit[1])}:{})};}
 }
 return {courseId:'',publicCover:false}; // Unknown course directories fail closed.
}
export async function courseAssetAllowed(accessToken:string,courseId:string):Promise<boolean>{
 if(!accessToken||!courseId)return false;
 try{
  assertStagingIsolation();
  if(!await tenantCourseAssigned(courseId,accessToken))return false;
  // PostgREST verifies the JWT signature/expiry; the RPC binds auth.uid(), checks
  // the live session, MFA and current entitlement. No browser actor is trusted.
  const r=await fetch(`https://${process.env.ALP_ENVIRONMENT==='training-production'?configuredDatabaseRef():STAGING_DATABASE_REF}.supabase.co/rest/v1/rpc/v2_course_asset_access`,{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,authorization:`Bearer ${accessToken}`,'content-type':'application/json'},body:JSON.stringify({p_course:courseId}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
  return r.ok&&(await r.json())===true;
 }catch{return false;}
}
export async function courseAssetRoute(accessToken:string,courseId:string):Promise<{preview?:boolean;editionId?:string}|null>{
 if(!accessToken||!courseId)return null;
 try{
  assertStagingIsolation();
  if(!await tenantCourseAssigned(courseId,accessToken))return null;
  const r=await fetch(`https://${process.env.ALP_ENVIRONMENT==='training-production'?configuredDatabaseRef():STAGING_DATABASE_REF}.supabase.co/rest/v1/rpc/v3_course_asset_route`,{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,authorization:`Bearer ${accessToken}`,'content-type':'application/json'},body:JSON.stringify({p_course:courseId})});
  if(!r.ok)return null;const value=await r.json();
  if(!value){const company=productionCompanyId();try{await fetch(`https://${configuredDatabaseRef()}.supabase.co/rest/v1/rpc/v6_distribution_denial`,{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,authorization:`Bearer ${accessToken}`,'content-type':'application/json'},body:JSON.stringify({p_course:courseId,p_company:company})});}catch{/* Monitoring never grants access or replaces a denial. */}}
  return value&&(value.preview===true||/^[a-f0-9-]{36}$/.test(value.editionId??''))?value:null;
 }catch{return null;}
}

export async function tigerAssetAllowed(accessToken:string,courseId:string,unit:number):Promise<boolean>{
 try{
  assertStagingIsolation();
  if(!Number.isInteger(unit)||unit<1||unit>8)return false;
  const {getCurrentSession}=await import('@/server/auth/session');
  const session=await getCurrentSession();if(!session||session.accessToken!==accessToken)return false;
  const {getCourseAccess}=await import('@/lib/services/enrolments/get-course-access');
  const access=await getCourseAccess({accessToken,userId:session.user.id,userEmail:session.user.email,courseId});
  if(!access.canAccess)return false;
  const {storedEdition}=await import('@/server/services/course-editions');
  const {getCourseBySlug}=await import('@/lib/courses');
  const edition=access.editionId?await storedEdition(access.editionId):null;
  if(access.editionId&&(!edition||edition.runtime_course_id!==courseId))return false;
  const source=edition?.course_document??getCourseBySlug(courseId);
  const {isTigerCourse}=await import('@/lib/tiger-progression');
  if(!source||!isTigerCourse(source))return false;
  const course={...source,id:courseId,...(edition?{editionId:edition.id}:{})};
  const target=course.units.find(u=>u.slug===`lu${unit}`);if(!target)return false;
  // Reuse the verified learner/edition gate used by the learning page. The
  // former invoker RPC also queried a deliberately private editions table,
  // causing permission-denied even for valid enrolments. No grants are widened.
  const {tigerUnitAllowed}=await import('@/server/services/tiger-progression');
  return tigerUnitAllowed(session,course,target);
 }catch{return false;}
}
