import 'server-only';
import {cache} from 'react';
import {getCourses} from '@/lib/courses';
import {adminRest} from '@/server/supabase/admin-rest';
import {providerFetch as fetch} from '@/server/security/provider-fetch';
import {getSupabaseRestUrl} from '@/server/auth/session';

// The dedicated production deployment is bound to its company by server config.
// Principals retain administration rights, but cannot escape this site's catalogue.
export function productionCompanyId(){
 if(process.env.ALP_ENVIRONMENT!=='training-production')return null;
 const company=process.env.ALP_DEFAULT_ORGANISATION_ID;
 if(!company||!/^[0-9a-f-]{36}$/i.test(company))throw Error('Production company is not configured.');
 return company;
}
const assignedIds=cache(async():Promise<Set<string>|null>=>{
 const company=productionCompanyId();if(!company)return null;
 const response=await adminRest(`/rest/v1/organisation_offerings?organisation_id=eq.${company}&status=in.(draft,published)&select=course_id`);
 if(!response.ok)throw Error('Company course assignments are unavailable.');
 return new Set((await response.json() as Array<{course_id:string}>).map(r=>r.course_id));
});
export async function tenantCourseAssigned(courseId:string,accessToken?:string){
 const ids=await assignedIds();if(ids===null||ids.has(courseId))return true;
 const company=productionCompanyId();if(!company||!accessToken)return false;
 const url=getSupabaseRestUrl('/rest/v1/rpc/v6_learner_continuity');if(!url)return false;
 const r=await fetch(url,{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,authorization:`Bearer ${accessToken}`,'content-type':'application/json'},body:JSON.stringify({p_course:courseId,p_company:company})});
 return r.ok&&(await r.json())===true;
}
export async function getTenantCourses(){const ids=await assignedIds();return getCourses().filter(c=>ids===null||ids.has(c.id));}

// A company assignment also includes drafts for administration and review.
// Learner discovery must use that company's explicitly published release.
export const getTenantPublishedCourseIds=cache(async():Promise<Set<string>|null>=>{
 const company=productionCompanyId();if(!company)return null;
 const response=await adminRest(`/rest/v1/organisation_offerings?organisation_id=eq.${company}&status=eq.published&or=(reviewed_release_id.not.is.null,shared_distribution_id.not.is.null)&select=course_id,status,reviewed_release_id,shared_distribution_id`);
 if(!response.ok)throw Error('Published company courses are unavailable.');
 const rows=await response.json() as Array<{course_id:string;status:string;reviewed_release_id:string|null;shared_distribution_id?:string|null}>;
 return new Set(rows.filter(row=>row.status==='published'&&(!!row.reviewed_release_id||!!row.shared_distribution_id)).map(row=>row.course_id));
});
