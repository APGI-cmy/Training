import 'server-only';
import {courses} from '@/lib/course-catalogue';
import {getCourseCover} from '@/lib/course-covers';
import {assertStagingIsolation,STAGING_DATABASE_REF} from '@/server/environment-isolation';

// Match decoded path segments, never file extensions: videos, scripts and PDFs
// must have the same access boundary as the presentation that references them.
export function decodedCoursePath(path:string):string|null {
 try {
  const decoded=decodeURIComponent(path);
  if(!decoded.startsWith('/courses/')||/[\\\u0000-\u001f\u007f%?#]/.test(decoded)||decoded.slice(1).split('/').some(p=>p==='.'||p==='..'||p===''))return null;
  return decoded;
 }catch{return null;}
}
export function courseAssetTarget(path:string):{courseId:string;publicCover:boolean}|null {
 const decoded=decodedCoursePath(path);if(!decoded)return {courseId:'',publicCover:false};
 // These exact extensionless paths are application pages, whose DAL already
 // checks access. Physical course files live below the registered roots.
 if(/^\/courses\/(?:vpshr-level-0(?:\/(?:introduction|lu\d+|unit\d+))?|scannex-training-programme)$/.test(decoded))return null;
 for(const course of courses){
  const root=decodeURIComponent(course.sourceRoot);
  if(decoded===root||decoded.startsWith(root+'/'))return {courseId:course.id,publicCover:decoded===decodeURIComponent(getCourseCover(course.slug)?.src??'')};
 }
 return {courseId:'',publicCover:false}; // Unknown course directories fail closed.
}
export async function courseAssetAllowed(accessToken:string,courseId:string):Promise<boolean>{
 if(!accessToken||!courseId)return false;
 try{
  assertStagingIsolation();
  // PostgREST verifies the JWT signature/expiry; the RPC binds auth.uid(), checks
  // the live session, MFA and current entitlement. No browser actor is trusted.
  const r=await fetch(`https://${STAGING_DATABASE_REF}.supabase.co/rest/v1/rpc/v2_course_asset_access`,{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,authorization:`Bearer ${accessToken}`,'content-type':'application/json'},body:JSON.stringify({p_course:courseId}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
  return r.ok&&(await r.json())===true;
 }catch{return false;}
}
