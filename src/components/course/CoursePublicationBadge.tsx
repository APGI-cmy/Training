import styles from './course-publication-badge.module.css';

export function CoursePublicationBadge({published,underReview=false,reviewContinuing=false}:{published:boolean|null;underReview?:boolean;reviewContinuing?:boolean}){
 const state=published===true?'published':published===null&&!underReview?'unknown':'review';
 const text=state==='published'&&reviewContinuing?'Published — review continuing':{published:'Published',review:'Under review',unknown:'Publication status unavailable'}[state];
 const explanation=state==='published'&&reviewContinuing?'A training release is published. Outstanding review work remains open; publication does not record reviewer approval.':{published:'An approved release is published. Learner access still depends on company allocation and enrolment.',review:'This course has no confirmed published release. Complete its publication workflow before release.',unknown:'The publication record could not be checked. Reload to try again.'}[state];
 return <span className={`${styles.badge} ${styles[state]}`} title={explanation} aria-label={`Publication status: ${text}`}><span aria-hidden="true">{state==='published'?'✓':state==='review'?'●':'?'}</span> {text}</span>;
}
