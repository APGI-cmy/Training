import 'server-only';
import {getCourseBySlug,getCourses} from '@/lib/courses';
import {freezeCoursePaths,accessHasExpired,type EditionCourse} from '@/lib/course-editions';
import type {Course} from '@/types/course';
import {rows} from './company-structure';
import {getCurrentSession,getUserRoles,type AlpSession} from '@/server/auth/session';
import {tenantCourseAssigned} from './tenant-courses';

export type StoredEdition={id:string;course_id:string;runtime_course_id:string;runtime_slug:string;edition_number:number;state:string;course_document:Course;file_count:number;byte_count:number;content_hash:string;verified_at:string|null};
export async function storedEdition(id:string){
 if(!/^[a-f0-9-]{36}$/.test(id))return null;
 return (await rows<StoredEdition>(`/rest/v1/course_editions?id=eq.${id}&state=eq.ready&select=*&limit=1`))[0]??null;
}
// Learning resolves a pinned document. Review/admin preview continues to use
// the editable source registry; a draft must never overwrite this document.
export async function getLearningCourse(slug:string,providedSession?:AlpSession|null):Promise<EditionCourse|undefined>{
 const session=providedSession??await getCurrentSession();if(!session)return undefined;
 const source=getCourseBySlug(slug);
 if(source&&!await tenantCourseAssigned(source.id,session.accessToken))return undefined;
 let edition:StoredEdition|null=null;
 if(source){
  const enrolment=(await rows<{edition_id:string|null}>(`/rest/v1/course_enrolments?user_id=eq.${session.user.id}&course_id=eq.${encodeURIComponent(source.id)}&select=edition_id&limit=1`))[0];
  if(enrolment?.edition_id){edition=await storedEdition(enrolment.edition_id);if(!edition)throw Error('The enrolled edition is unavailable.');}
  else return source;
 }else{
  edition=(await rows<StoredEdition>(`/rest/v1/course_editions?runtime_slug=eq.${encodeURIComponent(slug)}&state=eq.ready&select=*&limit=1`))[0]??null;
  if(!edition)return undefined;
  if(!await tenantCourseAssigned(edition.course_id,session.accessToken))return undefined;
  const enrolments=await rows<{id:string}>(`/rest/v1/course_enrolments?user_id=eq.${session.user.id}&course_id=eq.${encodeURIComponent(edition.runtime_course_id)}&select=id&limit=1`);
  if(!enrolments.length&&!(await getUserRoles(session.accessToken)).includes('admin'))return undefined;
 }
 const books=await rows<{path:string}>(`/rest/v1/course_edition_assets?edition_id=eq.${edition.id}&path=like.*book.pdf&select=path`);
 const document={...edition.course_document,units:edition.course_document.units.map(unit=>{const path=decodeURIComponent(unit.assetBase)+'/data/book.pdf';return {...unit,...(books.some(b=>b.path===path)?{ebookPath:path}:{})};})};
 return freezeCoursePaths(document,edition.id,edition.edition_number);
}
export async function canReadEditionAsset(session:AlpSession,edition:StoredEdition,path:string){
 if((await getUserRoles(session.accessToken)).includes('admin'))return true;
 const enrolled=(await rows<{status:string;edition_id:string|null;access_expires_at:string|null}>(`/rest/v1/course_enrolments?user_id=eq.${session.user.id}&course_id=eq.${encodeURIComponent(edition.runtime_course_id)}&select=status,edition_id,access_expires_at&limit=1`))[0];
 if(enrolled?.status==='enrolled'&&enrolled.edition_id===edition.id&&!accessHasExpired(enrolled.access_expires_at))return true;
 // A paid book is a single-file licence, never a route to the presentation.
 return (await rows<{ebook_paths:string[]}>(`/rest/v1/course_purchase_entitlements?user_id=eq.${session.user.id}&edition_id=eq.${edition.id}&kind=eq.ebook&state=eq.active&mode=eq.live&select=ebook_paths`)).some(e=>Array.isArray(e.ebook_paths)&&e.ebook_paths.includes(path));
}
export async function getMyLearningCourses(session:AlpSession):Promise<EditionCourse[]>{
 const enrolments=await rows<{course_id:string;edition_id:string|null}>(`/rest/v1/course_enrolments?user_id=eq.${session.user.id}&select=course_id,edition_id`);
 const courses=await Promise.all(enrolments.map(async e=>{
  if(e.edition_id){const edition=await storedEdition(e.edition_id);if(!edition)throw Error('An enrolled edition is unavailable.');return freezeCoursePaths(edition.course_document,edition.id,edition.edition_number);}
  return getCourses().find(c=>c.id===e.course_id);
 }));return courses.filter((c):c is EditionCourse=>!!c);
}
