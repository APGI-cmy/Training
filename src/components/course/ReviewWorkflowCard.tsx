import Link from 'next/link';
import {Fragment} from 'react';
import {canWork} from '@/lib/course-review';
import type {ReviewWorkflowSummary} from '@/lib/review-workflow-summary';
import {CoursePublicationBadge} from './CoursePublicationBadge';

const date=(value:string)=>new Date(value).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg'});
export type SharedPublication = {id:string;companyId:string;companyName:string};

export function SharedPublicationLinks({shares}:{shares:SharedPublication[]}){
 if(!shares.length)return null;
 return <p>Shared with {shares.map((share,index)=><Fragment key={share.id}>
  {index>0?', ':''}
  <Link href={`/course-sharing?company=${share.companyId}#share-${share.id}`}>{share.companyName}</Link>
 </Fragment>)}</p>;
}

export function ReviewWorkflowCard({summary,shares=[]}:{summary:ReviewWorkflowSummary;shares?:SharedPublication[]}){
 const {current,openReview,publishedRelease,published,reviewContinuing,history}=summary;
 return <article className="review-box" aria-label={`${current.document.title} — ${current.document.brand.name} workflow`}>
  <h2>{current.document.title}</h2>
  {published!==false||openReview?<CoursePublicationBadge published={published} underReview={published!==null&&!!openReview} reviewContinuing={reviewContinuing}/>:<p><strong>No current published release — review history retained</strong></p>}
  <p>{current.document.brand.name}</p>
  {published&&reviewContinuing?<p>The course is published and available to enrolled learners. Outstanding review work remains open.</p>:published?<p>The published course is available to enrolled learners.</p>:openReview?<p>Continue the outstanding review and publication tasks.</p>:null}
  <SharedPublicationLinks shares={shares}/>
  {openReview?<p>Review cutoff: {date(openReview.document.cutoff)} SAST{!canWork(openReview)&&reviewContinuing?' · Unfinished review tasks are overdue.':''}</p>:null}
  <p><Link className="primary-button" href={`/course-reviews/${current.id}${current.status==='cancelled'?'/archive':''}`}>{reviewContinuing?'Continue review':current.status==='cancelled'?'View archived review':'View publication workflow'}</Link>{publishedRelease&&publishedRelease.id!==current.id?<> · <Link href={`/course-reviews/${publishedRelease.id}`}>View published release</Link></>:null}</p>
  {history.length?<details><summary>Earlier releases and review history ({history.length})</summary><ul>{history.map(r=><li key={r.id}><Link href={`/course-reviews/${r.id}${r.status==='cancelled'?'/archive':''}`}>{r.status==='published'?'Published release':r.status==='cancelled'?'Archived review':'Earlier review'} · {date(r.created_at)} SAST</Link></li>)}</ul><p>Earlier findings, implementation responses and endorsements are preserved.</p></details>:null}
 </article>;
}
