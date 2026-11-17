import 'server-only';
import {headers} from 'next/headers';
import {cache} from 'react';
import {rows} from './company-structure';
import {companyWatermarks} from '@/lib/watermarks';
import {visibleBrandFooter,isPartnerBrand} from '@/lib/white-label';
import {getSupabaseRestUrl} from '@/server/auth/session';
import type {CourseBranding} from '@/lib/branding';
export type TenantBrand={id:string;name:string;slug:string;logo_path:string|null;primary_color:string;secondary_color:string;accent_color:string;pale_color:string;footer_text:string;watermarks?:unknown;email_from?:string|null;email_sender_verified?:boolean};
export const publicCompanyBrand=(b:TenantBrand):CourseBranding=>{const w=companyWatermarks(b.watermarks).platform;return {courseId:`organisation:${b.slug}`,brandName:b.name,logoUrl:b.logo_path?getSupabaseRestUrl(`/storage/v1/object/public/alp-branding-assets/${b.logo_path}`):null,primaryColor:b.primary_color,secondaryColor:b.secondary_color,accentColor:b.accent_color,paleColor:b.pale_color,footerText:visibleBrandFooter(b.name,b.footer_text),hidePlatformBranding:isPartnerBrand(b.name),watermark:w,watermarkUrl:w.imagePath?getSupabaseRestUrl(`/storage/v1/object/public/alp-branding-assets/${w.imagePath}`):null,isActive:true};};
export async function tenantForHost(raw:string):Promise<TenantBrand|null>{const host=raw.toLowerCase().replace(/:\d+$/,'');if(!/^[a-z0-9.-]+$/.test(host))return null;if(process.env.ALP_ENVIRONMENT!=='training-production'&&(/\.vercel\.app$/.test(host)||['localhost','127.0.0.1'].includes(host)))return null;try{const mapping=(await rows<{organisation_id:string}>(`/rest/v1/organisation_domains?host=eq.${host}&state=eq.active&select=organisation_id&limit=1`))[0];const chosen=mapping?.organisation_id??(process.env.ALP_ENVIRONMENT==='training-production'?process.env.ALP_DEFAULT_ORGANISATION_ID:undefined);if(chosen&&!/^[0-9a-f-]{36}$/i.test(chosen))return null;return chosen?(await rows<TenantBrand>(`/rest/v1/organisations?id=eq.${chosen}&is_active=eq.true&select=*&limit=1`))[0]??null:null;}catch{return null;}}
export const requestTenant=cache(async()=>tenantForHost((await headers()).get('host')??''));
export async function tenantBrandForHost(host:string){const b=await tenantForHost(host);return b?publicCompanyBrand(b):null;}
export async function requestTenantBrand(){const b=await requestTenant();if(b)return publicCompanyBrand(b);if(process.env.ALP_ENVIRONMENT==='training-production')return {courseId:'organisation:unavailable',brandName:process.env.ALP_DEFAULT_BRAND_NAME??'Training',logoUrl:null,primaryColor:'#000722',secondaryColor:'#021639',accentColor:'#cbb255',paleColor:'#5ac8fa',footerText:'',hidePlatformBranding:true,isActive:false} satisfies CourseBranding;return null;}
