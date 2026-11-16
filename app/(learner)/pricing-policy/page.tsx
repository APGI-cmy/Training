import Link from 'next/link';
import {requireSession} from '@/server/auth/session';
import {rows,ownMemberships} from '@/server/services/company-structure';
import {isPlatformPrincipal} from '@/server/services/platform-principals';
export default async function PricingPolicyPage(){
 const session=await requireSession(),canManage=await isPlatformPrincipal(session)||(await ownMemberships(session,true)).length>0;
 const active=await rows<{policy_id:string;effective_at:string}>(`/rest/v1/cc_policy_activations?effective_at=lte.${encodeURIComponent(new Date().toISOString())}&select=policy_id,effective_at&order=effective_at.desc&limit=1`);
 const policy=(await rows<{id:string;version:string;body:string}>(`/rest/v1/cc_policy_versions?${active[0]?`id=eq.${active[0].policy_id}&`:''}select=id,version,body&order=created_at.desc&limit=1`))[0];
 return <main className="admin-page"><h1>Course access and commercial pricing policy</h1><nav className="button-row"><Link href="/policies">Policy library</Link>{canManage?<Link href="/course-calculator">Course calculator and approval status</Link>:null}</nav>{policy?<section className="admin-form-card"><h2>{policy.version}</h2><p>{active[0]?`Published exact version. Effective ${active[0].effective_at}.`:'Proposed version for review — not yet effective. Both principal approvals and an explicit publication record are required.'}</p><pre style={{whiteSpace:'pre-wrap',font:'inherit'}}>{policy.body}</pre></section>:<p>The pricing-policy version is being prepared. Existing accepted course terms remain in force.</p>}</main>;
}
