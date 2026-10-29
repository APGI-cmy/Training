import type {ReviewFinding} from '@/lib/course-review';
import {notificationRound} from './review-notification';
export function cleanReviewRound(reviewers=2,units=1){
 const r=notificationRound();r.document.reviewProcessVersion=3;r.document.reports=[];
 r.document.units=Array.from({length:units},(_,i)=>({slug:`lu${i+1}`,title:`Learning unit ${i+1}`}));
 r.document.participants=Array.from({length:reviewers},(_,i)=>({...notificationRound().document.participants[i%3],email:i<3?notificationRound().document.participants[i].email:`person${i}@example.com`,userId:i<3?['johan','jorrie','reviewer'][i]:`person${i}`,state:'active' as const,coverage:r.document.units.map(u=>u.slug)}));
 r.document.findings=r.document.units.flatMap(u=>r.document.participants.map((p,i):ReviewFinding=>({id:`${u.slug}-${i}`,unit:u.slug,reference:'Entire LU',author:p.email,userId:p.userId!,at:`2026-10-29T10:0${i}:00Z`,fingerprint:r.fingerprint,category:'Content',outcome:'satisfied',satisfiedParts:['lu','quiz'],blocking:false,status:'closed',text:'I reviewed the entire LU and quizzes. Nothing needs changing.',replies:[]})));
 return r;
}
