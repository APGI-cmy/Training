import 'server-only';
import {cookies} from 'next/headers';
import {providerFetch as fetch} from '@/server/security/provider-fetch';
import {getSupabaseRestUrl} from '@/server/auth/session';
import type {AssetSegment} from '@/lib/course-editions';
import {tigerAssetAllowed,courseAssetRoute} from '@/server/security/course-assets';
import {storedEdition} from '@/server/services/course-editions';
export type EditionAsset={byte_count:number;content_type:string;segments:AssetSegment[]};
export async function editionAssetManifest(edition:string,path:string):Promise<EditionAsset|null>{
 if(!/^[a-f0-9-]{36}$/.test(edition))return null;
 const token=(await cookies()).get('alp_access_token')?.value;if(!token)return null;
 const response=await fetch(getSupabaseRestUrl('/rest/v1/rpc/v3_edition_asset_manifest')!,{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({p_edition:edition,p_path:path})});
 if(!response.ok){if([400,401,403].includes(response.status))return null;throw Error('Edition authorization unavailable');}
 const tigerUnit=/^\/courses\/Tiger kidnapping_telecommunications\/LU([1-8])\/res\//.exec(path);
 if(tigerUnit&&!/\.pdf$/i.test(path)){
  const saved=await storedEdition(edition);if(!saved)return null;
  const route=await courseAssetRoute(token,saved.runtime_course_id);
  if(!route)return null;
  if(!route.preview&&!await tigerAssetAllowed(token,saved.runtime_course_id,Number(tigerUnit[1])))return null;
 }
 return response.json();
}
