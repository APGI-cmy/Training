import {describe,expect,it} from 'vitest';
import {commercialSignoffProgress,type CommercialSignoffRecord} from '@/lib/commercial-signoff-progress';
import {findWorkflowStep,publicationGuide} from '@/lib/publication-guide';
import {notificationRound} from './fixtures/review-notification';

const assignments=['johan','jorrie','tshepo'].map((person,i):CommercialSignoffRecord=>({
 id:String(i),batch_id:'current',fingerprint:'the-exact-offer',reviewer_email:person+'@example.invalid',
 state:'open',cycle:1,superseded_by:null,decisions:null,response_email:null,response_cycle:null,
}));
function signed(record:CommercialSignoffRecord,decision:'approve'|'changes'='approve'):CommercialSignoffRecord{
 return {...record,state:'responded',decisions:{'course-pricing':decision},response_email:record.reviewer_email,response_cycle:record.cycle};
}
describe('Commercial approvals on the current proposal',()=>{
 it('turns only the commercial stage green after every assigned reviewer signs the exact offer',()=>{
  const round=notificationRound(),baseline=JSON.stringify(round);
  const guide=(records:CommercialSignoffRecord[])=>publicationGuide(round,round.fingerprint,1,assignments[0].reviewer_email,undefined,commercialSignoffProgress(records));
  const before=guide(assignments),partial=guide([signed(assignments[0]),signed(assignments[1]),assignments[2]]);
  const done=guide(assignments.map(a=>signed(a)));
  expect(findWorkflowStep(before,'commercials')).toMatchObject({done:false,note:'0 of 3 commercial sign-offs recorded'});
  expect(findWorkflowStep(partial,'commercials')).toMatchObject({done:false,note:'2 of 3 commercial sign-offs recorded'});
  expect(findWorkflowStep(done,'commercials')).toMatchObject({done:true,note:'3 of 3 commercial sign-offs recorded',children:[{done:true},{done:true},{done:true}]});
  expect(done.filter(step=>step.id!=='commercials')).toEqual(before.filter(step=>step.id!=='commercials'));
  expect(JSON.stringify(round)).toBe(baseline);
 });
 it('excludes superseded, cross-account or earlier-cycle approvals and keeps changes requested red',()=>{
  const [a,b,c]=assignments.map(r=>signed(r));
  expect(commercialSignoffProgress([a,b,{...c,response_cycle:0}])).toMatchObject({complete:false,approved:2});
  expect(commercialSignoffProgress([a,b,{...c,response_email:'someone-else@example.invalid'}])).toMatchObject({complete:false,approved:2});
  expect(commercialSignoffProgress([a,b,signed(c,'changes')])).toMatchObject({complete:false,approved:2});
  expect(commercialSignoffProgress([{...c,superseded_by:'current',batch_id:'previous'},a,b,assignments[2]])).toMatchObject({complete:false,approved:2,total:3});
  expect(commercialSignoffProgress([a,b,{...c,fingerprint:'different'}])).toMatchObject({complete:false});
 });
});
