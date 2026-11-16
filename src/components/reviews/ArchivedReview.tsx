import Link from 'next/link';
import type {ReviewRound} from '@/lib/course-review';

const date=(value:string)=>new Date(value).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg'});
export function ArchivedReview({round,principal}:{round:ReviewRound;principal:boolean}){
 const d=round.document,people=d.participants??[],findings=d.findings??[],reports=d.reports??[],events=d.events??[];
 return <main className="review-page"><Link href="/course-reviews">All course reviews</Link><h1>{d.title}</h1>
  <section className="review-box" role="status"><h2>Cancelled review — read-only history</h2><p>{d.brand?.name} · Cancelled · Revision {round.revision}</p><p>This review was cancelled. No review, endorsement, approval or publication action is required here. Its saved evidence remains retained.</p><p>To continue a current course review, return to All course reviews and open its active workflow.</p></section>
  <section className="review-box"><h2>Saved review team</h2>{people.length?<ul>{people.map(p=><li key={p.email}>{p.email} · {p.state??'Earlier record'} · {Array.isArray(p.coverage)?`${p.coverage.length} learning units confirmed`:'Coverage not recorded in this earlier review'}</li>)}</ul>:<p>No reviewers were recorded.</p>}</section>
  <section className="review-box"><h2>Retained content feedback</h2>{findings.length?findings.map(f=><article key={f.id}><h3>{f.unit?.toUpperCase()} · {f.reference} · {f.status}</h3><p>{f.author} · {date(f.at)} SAST</p><p style={{whiteSpace:'pre-wrap'}}>{f.text}</p>{(f.replies??[]).map((r,i)=><p key={`${r.at}-${i}`}>{r.email}: {r.text}</p>)}</article>):<p>No content findings were saved in this review.</p>}{reports.map(r=><details key={r.id}><summary>Saved report — {r.email} · {date(r.at)} SAST</summary><p style={{whiteSpace:'pre-wrap'}}>{r.text}</p>{(r.endorsements??[]).map((e,i)=><p key={`${e.at}-${i}`}>{e.email} · {e.decision}: {e.text}</p>)}</details>)}</section>
  <section className="review-box"><h2>Retained event history</h2>{events.length?<ol>{events.map((e,i)=><li key={`${e.at}-${i}`}>{date(e.at)} SAST · {e.actor} · {e.action.replaceAll('_',' ')}{principal&&e.detail?<p style={{whiteSpace:'pre-wrap'}}>{e.detail}</p>:null}</li>)}</ol>:<p>No events were recorded.</p>}</section>
 </main>;
}
