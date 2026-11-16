import 'server-only';
import {adminRest} from '@/server/supabase/admin-rest';

// Presentation metadata only. This never grants catalogue access or enrolment.
export async function getPublishedCourseIds(courseIds:string[]):Promise<Set<string>|null>{
 if(!courseIds.length)return new Set();
 const filter=courseIds.map(id=>`"${id.replaceAll('"','\\"')}"`).join(',');
 try{
  const response=await adminRest(`/rest/v1/organisation_offerings?status=eq.published&reviewed_release_id=not.is.null&course_id=in.(${encodeURIComponent(filter)})&select=course_id,status,reviewed_release_id`);
  if(!response.ok)return null;
  const rows=await response.json() as {course_id:string;status:string;reviewed_release_id:string|null}[];
  return new Set(rows.filter(r=>courseIds.includes(r.course_id)&&r.status==='published'&&!!r.reviewed_release_id).map(r=>r.course_id));
 }catch{return null;}
}
