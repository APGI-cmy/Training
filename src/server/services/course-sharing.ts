import 'server-only';
import {getCourseBySlug} from '@/lib/courses';
import {validId} from '@/lib/company-structure';
import type {AlpSession} from '@/server/auth/session';
import {ownMemberships,requireCompanyForSession,rows} from './company-structure';
import {isPlatformPrincipal} from './platform-principals';

export async function requireCourseSharingOwner(companyId:string,session:AlpSession){
 const access=await requireCompanyForSession(validId(companyId),true,session);
 const allowed=access.company.slug==='apgi'?await isPlatformPrincipal(session):
  (await ownMemberships(session,true)).some(m=>m.organisation_id===companyId);
 if(!allowed)throw Error('Only the declared course owner may share it. Developing or administering a course does not grant ownership.');
 return access;
}
export async function courseSharingWorkspace(companyId:string,session:AlpSession){
 const access=await requireCourseSharingOwner(companyId,session);
 const [owned,offerings,companies,grants]=await Promise.all([
  rows<{id:string}>(`/rest/v1/courses?owner_organisation_id=eq.${companyId}&select=id`),
  rows<{course_id:string;reviewed_release_id:string}>(`/rest/v1/organisation_offerings?organisation_id=eq.${companyId}&status=eq.published&reviewed_release_id=not.is.null&select=course_id,reviewed_release_id`),
  rows<{id:string;name:string}>('/rest/v1/organisations?is_active=eq.true&select=id,name&order=name.asc'),
  rows<{course_id:string;recipient_organisation_id:string;is_active:boolean;reason:string}>(`/rest/v1/course_sharing_grants?owner_organisation_id=eq.${companyId}&select=course_id,recipient_organisation_id,is_active,reason`),
 ]);
 const ownedIds=new Set(owned.map(c=>c.id));
 const releases=offerings.length?await rows<{id:string;course_id:string;status:string}>(`/rest/v1/course_review_rounds?organisation_id=eq.${companyId}&status=eq.published&id=in.(${offerings.map(o=>validId(o.reviewed_release_id)).join(',')})&select=id,course_id,status`):[];
 const eligible=offerings.filter(o=>ownedIds.has(o.course_id)&&releases.some(r=>r.id===o.reviewed_release_id&&r.course_id===o.course_id&&r.status==='published'));
 return {company:access.company,courses:eligible.flatMap(o=>{const c=getCourseBySlug(o.course_id);return c?[{id:c.id,title:c.title}]:[];}),companies:companies.filter(c=>c.id!==companyId),grants};
}
