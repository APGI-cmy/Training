import 'server-only';
import {getCourses} from '@/lib/courses';
import {getCourseCover} from '@/lib/course-covers';
import {APGI_BRAND,isBrandColor} from '@/lib/branding';
import {adminRest} from '@/server/supabase/admin-rest';
import {getSavedCourseCardImages} from '@/server/services/course-card-images';
import {getSupabaseRestUrl} from '@/server/auth/session';
import {companyWatermarks} from '@/lib/watermarks';

export type PublicCourse={slug:string;title:string;description:string;level:string;duration:string;href:string;cover:{src:string;alt:string}|null};
type Organisation={id:string;slug:string;is_active:boolean;logo_path?:string;primary_color?:string;secondary_color?:string;accent_color?:string;pale_color?:string;watermarks?:unknown};
async function rows<T>(path:string):Promise<T[]>{
 const response=await adminRest(path);if(!response.ok)throw Error('PUBLIC_CATALOGUE_UNAVAILABLE');
 const value:unknown=await response.json();if(!Array.isArray(value))throw Error('PUBLIC_CATALOGUE_UNAVAILABLE');return value;
}
// Export only public course summaries. No learner, review, assessment or client data.
export async function getPublicCatalogue(){
 const [organisations,settings,images]=await Promise.all([
  rows<Organisation>('/rest/v1/organisations?slug=eq.apgi&is_active=eq.true&select=id,slug,is_active,logo_path,primary_color,secondary_color,accent_color,pale_color,watermarks&limit=1'),
  rows<{course_id:string;visibility:string}>('/rest/v1/course_catalogue_settings?select=course_id,visibility'),
  getSavedCourseCardImages(),
 ]);
 const organisation=organisations.find(o=>o.slug==='apgi'&&o.is_active);
 if(!organisation)throw Error('PUBLIC_CATALOGUE_UNAVAILABLE');
 const offerings=await rows<{course_id:string;status:string;reviewed_release_id:string|null}>(`/rest/v1/organisation_offerings?organisation_id=eq.${encodeURIComponent(organisation.id)}&status=eq.published&reviewed_release_id=not.is.null&select=course_id,status,reviewed_release_id`);
 const published=new Set(offerings.filter(o=>o.status==='published'&&o.reviewed_release_id).map(o=>o.course_id));
 const visibility=new Map(settings.map(s=>[s.course_id,s.visibility]));
 const courses:PublicCourse[]=getCourses().filter(c=>c.catalogueVisibility!=='client_specific'&&visibility.get(c.id)!=='client_specific'&&published.has(c.id)).map(c=>{
  const image=images[c.slug]??getCourseCover(c.slug);
  return {slug:c.slug,title:c.title,description:c.description,level:c.level,duration:c.duration,href:`/courses/${encodeURIComponent(c.slug)}`,cover:image?{src:image.src,alt:image.alt}:null};
 });
 const color=(value:string|undefined,fallback:string)=>value&&isBrandColor(value)?value:fallback;
 const mark=companyWatermarks(organisation.watermarks).platform;
 return {schemaVersion:1,branding:{
  name:'APGI',logoUrl:organisation.logo_path?getSupabaseRestUrl(`/storage/v1/object/public/alp-branding-assets/${organisation.logo_path}`):'/branding/apgi-logo.png',
  primaryColor:color(organisation.primary_color,APGI_BRAND.primaryColor),secondaryColor:color(organisation.secondary_color,APGI_BRAND.secondaryColor),accentColor:color(organisation.accent_color,APGI_BRAND.accentColor),paleColor:color(organisation.pale_color,APGI_BRAND.paleColor),
  watermark:mark.kind==='image'&&mark.imagePath?{src:getSupabaseRestUrl(`/storage/v1/object/public/alp-branding-assets/${mark.imagePath}`),opacity:mark.opacity}:null,
 },courses};
}
