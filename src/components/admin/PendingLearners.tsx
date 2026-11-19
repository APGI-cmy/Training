import Link from 'next/link';
import {getCourseBySlug} from '@/lib/courses';
import type {PendingLearner} from '@/server/services/pending-learners';
function date(value:string){return new Date(value).toLocaleString('en-ZA',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Johannesburg'})+' SAST';}
export function PendingLearners({data,page,query,registeredPage}:{data:{total:number;learners:PendingLearner[]};page:number;query:string;registeredPage:number}){
 const href=(n:number)=>`/admin/learners?q=${encodeURIComponent(query)}&page=${registeredPage}&invitePage=${n}`;
 return <section className="directory-card" aria-labelledby="pending-learners-heading">
  <h2 id="pending-learners-heading">Invited learners — awaiting registration ({data.total})</h2>
  <p>These invitations are saved. Course access activates after the learner verifies their email and saves their profile. They are counted separately from registered learners. Expired and revoked invitations remain in invitation history.</p>
  {data.learners.length?<div className="directory-table-wrap"><table className="directory-table"><thead><tr><th>Invited learner</th><th>Assigned course and group</th><th>Status</th><th>Invited</th><th>Invitation valid until</th><th>History</th></tr></thead><tbody>{data.learners.map(l=><tr key={l.organisation_id+':'+l.email}><td><strong>{l.email}</strong><span>{l.company}</span></td><td>{l.invitations.map(i=><div key={i.invitationId}><strong>{getCourseBySlug(i.courseId)?.title??i.courseId}</strong><span>Group: {i.group??'Individual learner'}</span><span>{i.providerAccepted?'Email accepted by provider':'Email not confirmed as sent'}</span></div>)}</td><td><span className="status-badge status-pending">Awaiting registration</span></td><td>{date(l.invited_at)}</td><td>{date(l.expires_at)}</td><td><Link href={`/messages/email-management?search=${encodeURIComponent(l.email)}&company=${l.organisation_id}&category=learner_invitation`}>Email and invitation history</Link></td></tr>)}</tbody></table></div>:<p>No active invitations awaiting registration match this search.</p>}
  <nav aria-label="Invited learner pages"><span>Page {page} of {Math.max(1,Math.ceil(data.total/25))}</span> {page>1?<Link href={href(page-1)}>Previous invitations</Link>:null} {(page*25)<data.total?<Link href={href(page+1)}>Next invitations</Link>:null}</nav>
 </section>;
}
