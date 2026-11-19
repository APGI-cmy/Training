import 'server-only';
import {validId} from '@/lib/company-structure';
import {PLATFORM_RELEASE} from '@/lib/platform-release';
import type {PricingStructure} from '@/lib/pricing-structures';
import {getCourseBySlug} from '@/lib/courses';
import type {AlpSession} from '@/server/auth/session';
import {adminRest} from '@/server/supabase/admin-rest';
import {rows,requireCompanyForSession} from './company-structure';
import {requireCourseSharingOwner} from './course-sharing';
import {productionCompanyId} from './tenant-courses';
export type Distribution={id:string;course_id:string;owner_organisation_id:string;recipient_organisation_id:string;source_release_id:string;source_project:string;source_key:string;source_fingerprint:string;source_revision:number;source_actor:string;reason:string;state:'offered'|'concern'|'final'|'withdrawn';pricing_snapshot:PricingStructure|null;accepted_at:string|null;accepted_by:string|null;declined_at:string|null;margin_retained_bps:number;response_due_at:string|null;withdrawn_at:string|null};
export async function distributionRpc<T>(name:string,args:object):Promise<T>{
 if(!/^v6_[a-z_]+$/.test(name))throw Error('Invalid distribution operation.');
 const r=await adminRest('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(args)});
 if(!r.ok){const error=await r.json().catch(()=>({}));throw Error(error.code==='P0001'?error.message:'Sharing could not be updated. Existing records remain safe.');}
 return r.status===204?undefined as T:r.json();
}
export async function distributions(company:string,session:AlpSession){
 await requireCompanyForSession(validId(company),true,session);
 return rows<Distribution>(`/rest/v1/course_distribution?or=(owner_organisation_id.eq.${company},recipient_organisation_id.eq.${company})&select=*&order=created_at.desc&limit=200`);
}
export async function receivedPublishedShares(company=productionCompanyId(),allPlatforms=false){
 if(allPlatforms){const {requirePlatformPrincipal}=await import('./platform-principals');await requirePlatformPrincipal();}
 if(!company&&!allPlatforms)return [];
 return rows<Distribution>(`/rest/v1/course_distribution?${company?`recipient_organisation_id=eq.${validId(company)}&`:''}accepted_at=not.is.null&state=neq.withdrawn&select=*`);
}
export async function offerCourse(input:{course:string;owner:string;recipient:string;reason:string},session:AlpSession){
 const authority=await requireCourseSharingOwner(input.owner,session);validId(input.recipient);
 const site=PLATFORM_RELEASE.targets.find(t=>t.project===process.env.VERCEL_PROJECT_ID);
 if(!site?.workspaces.includes(authority.company.slug))throw Error('Open this course owner’s registered platform to offer its courses.');
 const recipient=(await rows<{slug:string}>(`/rest/v1/organisations?id=eq.${input.recipient}&is_active=eq.true&select=slug&limit=1`))[0];
 if(!recipient||!PLATFORM_RELEASE.targets.some(t=>t.workspaces.includes(recipient.slug)))throw Error('Register the receiving platform deployment before offering a course.');
 if(!getCourseBySlug(input.course))throw Error('Choose a registered course.');
 const {contentSource}=await import('./course-reviews');
 const source=await contentSource(input.course,input.owner),offering=(await rows<{reviewed_release_id:string}>(`/rest/v1/organisation_offerings?organisation_id=eq.${input.owner}&course_id=eq.${encodeURIComponent(input.course)}&status=eq.published&select=reviewed_release_id&limit=1`))[0];
 const published=offering?.reviewed_release_id?(await rows<{fingerprint:string}>(`/rest/v1/course_review_rounds?id=eq.${offering.reviewed_release_id}&status=eq.published&select=fingerprint&limit=1`))[0]:null;
 if(published?.fingerprint!==source.fingerprint)throw Error('The deployed course differs from its owner-published release. Publish the exact owner version before offering it to another platform.');
 const project=process.env.VERCEL_PROJECT_ID;
 if(!PLATFORM_RELEASE.targets.some(t=>t.project===project))throw Error('Distribution requires a registered platform deployment.');
 return distributionRpc<string>('v6_offer_course',{p_course:input.course,p_owner:input.owner,p_recipient:input.recipient,p_actor:session.user.id,p_reason:input.reason,p_project:project});
}
export async function decideDistribution(input:{id:string;company:string;action:string;reason:string;revision:number;days:number;margin:number},session:AlpSession){
 const d=(await distributions(input.company,session)).find(d=>d.id===validId(input.id));
 if(!d)throw Error('This sharing record is unavailable for your platform.');
 const recipient=['accept','decline','margin'].includes(input.action);
 if((recipient?d.recipient_organisation_id:d.owner_organisation_id)!==input.company)throw Error('Choose an action for your side of this course share.');
 if(!recipient&&d.source_project!==process.env.VERCEL_PROJECT_ID)throw Error('Only the original owner platform may issue course withdrawal notices.');
 if(input.action==='accept'){const {contentSource}=await import('./course-reviews');if((await contentSource(d.course_id,d.owner_organisation_id)).fingerprint!==d.source_fingerprint)throw Error('The deployed course differs from this offered release. Ask the owner for an updated published offer before accepting.');}
 const authority=await requireCourseSharingOwner(input.company,session);
 if(!PLATFORM_RELEASE.targets.find(t=>t.project===process.env.VERCEL_PROJECT_ID)?.workspaces.includes(authority.company.slug))throw Error('Record this decision on the relevant platform’s own registered site.');
 return distributionRpc<string>('v6_distribution_decide',{p_actor:session.user.id,p_id:d.id,p_action:input.action,p_reason:input.reason,p_revision:input.revision,p_days:input.days,p_margin:input.margin});
}
export async function assertNoSharedPriceRewrite(company:string,courseIds:string[]){
 if(!courseIds.length)return;
 const shares=await rows<{course_id:string}>(`/rest/v1/course_distribution?recipient_organisation_id=eq.${validId(company)}&state=neq.withdrawn&select=course_id`);
 if(shares.some(s=>courseIds.includes(s.course_id)))throw Error('Shared course costs and owner/APGI income are locked. Use the shared-course calculator on Course ownership and sharing to change only your own selling margin.');
}
