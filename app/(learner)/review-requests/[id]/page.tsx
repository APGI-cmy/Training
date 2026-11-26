import Link from 'next/link';
import {notFound,unstable_rethrow} from 'next/navigation';
import {requireReviewRequest} from '@/server/services/review-requests';
import {rows} from '@/server/services/company-structure';
import {REVIEW_KINDS} from '@/lib/review-requests';
import {ReviewRequestActions,ReviewRequestResponse,CopyReviewPack} from '@/components/reviews/ReviewRequestControls';
import {PricingReviewPreview} from '@/components/payments/PricingReviewPreview';
import {PartnerCommercialSummary} from '@/components/reviews/PartnerCommercialSummary';
import {prepaidDevelopment} from '@/lib/partner-commercial-terms';
export const dynamic='force-dynamic';
export default async function ReviewRequestPage({params}:{params:Promise<{id:string}>}){
 let access;
 try{access=await requireReviewRequest((await params).id);}
 catch(error){unstable_rethrow(error);notFound();}
 const {request:r,session,manager}=access;
 const pricing=r.snapshot.pricing;
 const partner=pricing&&!pricing.structure.company.isApgi?(await rows<{name:string;slug:string}>(`/rest/v1/organisations?id=eq.${r.organisation_id}&select=name,slug&limit=1`))[0]:null;
 const events=await rows<{id:string;operation:string;reason:string;created_at:string;payload:{decisions?:Record<string,string>}}>(`/rest/v1/v6_review_events?request_id=eq.${r.id}&select=id,operation,reason,created_at,payload&order=created_at.desc`);
 const mail=manager?await rows<{recipient:string;state:string;last_error:string|null}>(`/rest/v1/v6_review_mail?context->>requestId=eq.${r.id}&select=recipient,state,last_error&order=created_at.desc&limit=30`):[];
 return <main className="admin-page"><Link href="/review-requests">All review requests</Link><h1>{r.title}</h1><p>{REVIEW_KINDS[r.kind]} · Reviewer: {r.reviewer_email} · cycle {r.cycle} · deadline {new Date(r.deadline).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg'})} SAST</p><ReviewRequestActions request={r} manager={manager}/><p>{r.reason}</p>
 {r.source_round?<p><Link href={`/course-reviews/${r.source_round}#review-process`}>Continue the original learning-unit review and saved findings</Link>. Published learner training remains available.</p>:null}
 {r.snapshot.brand?<section className="admin-form-card"><h2>Branding snapshot</h2>{r.snapshot.brand.logo?<img src={r.snapshot.brand.logo} alt={r.snapshot.brand.name+' logo'} width={240}/>:null}<div className="button-row">{r.snapshot.brand.colors.map((c,i)=><div key={i} style={{background:c,padding:20,border:'1px solid #8aa2b1'}}><code style={{background:'#fff',color:'#102b47',padding:4}}>{c}</code></div>)}</div></section>:null}
 {pricing?partner?<PartnerCommercialSummary structure={pricing.structure} quantities={pricing.quantities} company={partner.name} retainer={pricing.retainer??prepaidDevelopment(partner.slug,pricing.primaryCourseId)}/>:<PricingReviewPreview review={pricing}/>:null}
 {r.superseded_by?<p><Link href={`/review-requests?company=${r.organisation_id}&kind=commercials#batch-${r.superseded_by}`}>Open the replacement pricing review</Link></p>:null}
 <CopyReviewPack request={r}/>{r.snapshot.items.map(i=><section className="admin-form-card" key={i.id}><h2>{i.title}</h2><p>Frozen version: {i.version}</p><pre className="review-request-document">{i.body}</pre>{i.courseId?<Link className="primary-button" href={`/review-requests/${r.id}/preview/${i.courseId}`}>Open all course learning units</Link>:null}{i.href?<Link href={i.href}>Open the original review workspace</Link>:null}{i.policyId?<Link href={`/api/review-requests/${r.id}/policy/${i.policyId}`}>Download the frozen policy PDF, if supplied</Link>:null}</section>)}
 {r.response?<section className="admin-form-card"><h2>Recorded human response</h2><p>{r.response.email} · {r.response.at}</p>{r.snapshot.items.map(i=><p key={i.id}>{i.title}: {r.response!.decisions[i.id]==='approve'?'Approved / signed off by this reviewer':'Changes requested'}</p>)}<p>{r.response.comment}</p></section>:null}
 {r.state==='open'&&Date.parse(r.deadline)>Date.now()&&session.user.email?.toLowerCase()===r.reviewer_email?<section className="admin-form-card"><h2>Your review and sign-off</h2><p>This records your response to this exact request. Required publication, policy activation and financial approvals remain separate.</p><ReviewRequestResponse request={r}/></section>:null}
 <section className="admin-form-card"><h2>Request history</h2>{events.map(e=><article key={e.id}><strong>{e.operation} · {new Date(e.created_at).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg'})} SAST</strong><p>{e.reason}</p>{e.payload.decisions?<pre className="review-request-document">{JSON.stringify(e.payload.decisions,null,2)}</pre>:null}</article>)}{!events.length?<p>Existing course assignment imported for tracking. Earlier review evidence remains in the original course workflow.</p>:null}</section>
 {manager?<section className="admin-form-card"><h2>Message delivery</h2>{mail.map((m,i)=><p key={i}>{m.recipient} · {m.state==='sent'?'Accepted by provider':m.state} {m.last_error??''}</p>)}<p>Provider acceptance is distinct from inbox delivery or reading.</p></section>:null}</main>;
}
