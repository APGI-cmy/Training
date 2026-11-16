import 'server-only';
import {STAGING_DATABASE_REF, STAGING_ORIGIN} from '@/server/environment-isolation';
import {costServices} from '@/lib/service-costs';
import {exchangeFeed} from '@/lib/currency-rates';

const publicSources=new Set([exchangeFeed,...costServices.map(s=>s.source).filter(Boolean)]);
// Every server HTTP destination is code-owned. Redirects cannot move credentials
// or request bodies to another provider. This is an application boundary, not a
// claim of a provider-wide network firewall or content-inspection service.
export function providerTarget(input:string|URL,init:RequestInit={}){
 const raw=String(input);
 if(/[\\\u0000-\u0020\u007f]/.test(raw))throw Error('OUTBOUND_TARGET_REJECTED');
 const url=new URL(raw), headers=new Headers(init.headers), method=(init.method??'GET').toUpperCase();
 if(url.protocol!=='https:'||url.username||url.password||url.hash||headers.has('cookie')||headers.has('host'))throw Error('OUTBOUND_TARGET_REJECTED');
 const auth=headers.get('authorization');
 if(url.origin===`https://${STAGING_DATABASE_REF}.supabase.co`&&/^\/(auth|rest|storage)\/v1\//.test(url.pathname)){
  if(auth&&!/^Bearer [A-Za-z0-9._-]+$/.test(auth))throw Error('OUTBOUND_CREDENTIAL_REJECTED');
  if(/^Bearer (re_|[rs]k_)/.test(auth??'')||/^(re_|[rs]k_)/.test(headers.get('apikey')??''))throw Error('OUTBOUND_CREDENTIAL_REJECTED');
 }else if(url.origin==='https://api.resend.com'&&/^\/emails(?:\/[A-Za-z0-9-]+)?$/.test(url.pathname)&&['GET','POST'].includes(method)){
  if(!auth?.startsWith('Bearer re_')||headers.has('apikey'))throw Error('OUTBOUND_CREDENTIAL_REJECTED');
 }else if(url.origin==='https://api.stripe.com'&&/^\/v1\/[A-Za-z0-9_/-]+$/.test(url.pathname)){
  if(!auth?.startsWith('Bearer rk_test_')||headers.has('apikey'))throw Error('OUTBOUND_CREDENTIAL_REJECTED');
 }else if((publicSources.has(url.href)||url.href===STAGING_ORIGIN+'/api/course-deployment')&&['GET','HEAD'].includes(method)&&init.body==null){
  if([...headers.keys()].some(k=>!['accept','user-agent'].includes(k)))throw Error('OUTBOUND_CREDENTIAL_REJECTED');
 }else throw Error('OUTBOUND_TARGET_REJECTED');
 // Reject headers containing any configured provider secret at the wrong host.
 for(const [key,host] of [['SUPABASE_SERVICE_ROLE_KEY',`${STAGING_DATABASE_REF}.supabase.co`],['NEXT_PUBLIC_SUPABASE_ANON_KEY',`${STAGING_DATABASE_REF}.supabase.co`],['STAGING_RESEND_API_KEY','api.resend.com']] as const){
  const secret=process.env[key];if(secret&&secret.length>8&&url.hostname!==host&&[...headers.values()].some(v=>v.includes(secret)))throw Error('OUTBOUND_CREDENTIAL_REJECTED');
 }
 return url;
}
export async function providerFetch(input:string|URL,init:RequestInit={}){
 const url=providerTarget(input,init);
 return fetch(url.href,{...init,redirect:'error',cache:'no-store',signal:init.signal?AbortSignal.any([init.signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000)});
}
