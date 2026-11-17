import 'server-only';
import {adminRest} from '@/server/supabase/admin-rest';
import {getSupabaseRestUrl} from '@/server/auth/session';
import {emailConfiguration} from './transactional-delivery';
import {validId} from '@/lib/company-structure';
export type RecipientBrand={name:string;logo:string|null;color:string;organisationId:string;origin:string;from:string|null;verified:boolean};
export async function recipientBrand(email:string,organisationId?:string):Promise<RecipientBrand|null>{
 let id=organisationId;
 if(!id){const r=await adminRest(`/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=user_id&limit=1`);if(r.ok){const p=(await r.json())[0];if(p?.user_id){const a=await adminRest(`/rest/v1/learner_organisations?user_id=eq.${p.user_id}&select=organisation_id&limit=1`);if(a.ok)id=(await a.json())[0]?.organisation_id;}}}
 if(!id){const r=await adminRest(`/rest/v1/course_invitations?recipient_email=eq.${encodeURIComponent(email)}&revoked_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=organisation_id&order=created_at.desc&limit=1`);if(r.ok)id=(await r.json())[0]?.organisation_id;}
 if(!id)return null;validId(id);
 const r=await adminRest(`/rest/v1/organisations?id=eq.${id}&is_active=eq.true&select=name,logo_path,primary_color,email_from,email_sender_verified&limit=1`);if(!r.ok)throw Error('Company mail identity unavailable');const b=(await r.json())[0];if(!b)throw Error('Company mail identity unavailable');
 let origin=emailConfiguration()?.origin.origin??process.env.NEXT_PUBLIC_APP_URL??'';
 const d=await adminRest(`/rest/v1/organisation_domains?organisation_id=eq.${id}&state=eq.active&is_primary=eq.true&select=host&limit=1`);if(d.ok){const host=(await d.json())[0]?.host;if(typeof host==='string'&&/^[a-z0-9.-]+$/.test(host))origin='https://'+host;}
 return {organisationId:id,name:b.name,logo:b.logo_path?getSupabaseRestUrl(`/storage/v1/object/public/alp-branding-assets/${b.logo_path}`):null,color:b.primary_color,origin,from:b.email_from??null,verified:b.email_sender_verified===true};
}
