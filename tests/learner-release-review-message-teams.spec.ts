import {describe,it,expect} from 'vitest';
import {notificationRound} from './fixtures/review-notification';
import {reviewNotificationTasks} from '@/lib/review-notification-tasks';
import {endorseFinding,findingPhase,submitImplementation,canEndorseFinding} from '@/lib/lu-review-workflow';
import type {ReviewFinding} from '@/lib/course-review';
function team(){
 const r=notificationRound();r.document.reviewProcessVersion=3;
 r.document.participants=Array.from({length:6},(_,i)=>({email:i===0?r.document.requester:`peer${i}@example.com`,userId:i===0?'johan':`peer${i}`,role:'primary' as const,state:'active' as const,coverage:[],tasks:['content' as const]}));
 const f:ReviewFinding={id:'own',unit:'lu1',at:'now',reference:'Slide 1',category:'Content',author:r.document.requester,userId:'johan',text:'Fixed navigation',status:'open',blocking:false,replies:[]};r.document.findings=[f];return {r,f};
}
describe('Messages and endorsements for larger review teams',()=>{
 it('notifies the finding author and other peers directly after implementation, excluding the implementation writer',()=>{
  const {r,f}=team();f.author='peer1@example.com';f.userId='peer1';
  submitImplementation(r,f,{email:r.document.requester,userId:'johan'},{id:'response',at:'now',implemented:'yes',notes:'Corrected the full presentation'});
  const before=JSON.stringify(r.document.participants);
  for(const p of r.document.participants){const tasks=reviewNotificationTasks({round:r,hash:r.fingerprint,brandRevision:1},p.email,p.userId!,p.userId==='johan');const endorsement=tasks.find(t=>t.key.includes(':lu-endorsement:'));expect(!!endorsement).toBe(p.userId!=='johan');expect(tasks.some(t=>t.key.includes(':lu-decision:'))).toBe(false);if(endorsement)expect(endorsement.actorUserId).toBe('johan');}
  expect(JSON.stringify(r.document.participants)).toBe(before);
  endorseFinding(r,f,{email:f.author,userId:f.userId},{at:'now',decision:'yes',reason:''});expect(findingPhase(r,f)).toBe('Closed');
 });
 it('does not retroactively reopen an earlier declined endorsement when this release is installed',()=>{
  const {r,f}=team();f.outcome='satisfied';f.workflowEndorsements=[{email:'peer1@example.com',userId:'peer1',at:'earlier',decision:'no',reason:'Earlier disagreement retained',findingAt:f.at,fingerprint:r.fingerprint}];
  expect(findingPhase(r,f)).toBe('Awaiting endorsement');expect(f.declarationReopen).toBeUndefined();
 });
 it('creates a separate, attributed endorsement task for each of five peers, then stops all after one yes',()=>{
  const {r,f}=team();submitImplementation(r,f,{email:f.author,userId:f.userId},{id:'response',at:'now',implemented:'yes',notes:'Fixed the slide advancement'});
  for(const p of r.document.participants.slice(1)){
   const tasks=reviewNotificationTasks({round:r,hash:r.fingerprint,brandRevision:1},p.email,p.userId!,false);
   const task=tasks.find(t=>t.key.includes(':lu-endorsement:'))!;
   expect(task.actorUserId).toBe('johan');expect(task.unit).toBe('lu1');expect(task.requirement).toContain('Endorsements');expect(task.requirement).toContain('confirm');expect(task.requirement).toContain('No requires a reason');
  }
  const p=r.document.participants[3];endorseFinding(r,f,{email:p.email,userId:p.userId!},{at:'now',decision:'yes',reason:''});
  expect(findingPhase(r,f)).toBe('Closed');for(const other of r.document.participants)expect(canEndorseFinding(r,f,other.email,other.userId!)).toBe(false);
 });
 it('a new no on a satisfied declaration returns it to its author, without fabricating implementation or changing coverage',()=>{
  const {r,f}=team();f.outcome='satisfied';const before=JSON.stringify(r.document.participants);
  const p=r.document.participants[1];endorseFinding(r,f,{email:p.email,userId:p.userId!},{at:'now',decision:'no',reason:'Please check the final quiz again'});
  expect(findingPhase(r,f)).toBe('Reopened');expect(f.implementationRounds).toBeUndefined();expect(JSON.stringify(r.document.participants)).toBe(before);
  const tasks=reviewNotificationTasks({round:r,hash:r.fingerprint,brandRevision:1},f.author,f.userId,true);expect(tasks.some(t=>t.key.includes(':lu-revise-declaration:'))).toBe(true);
 });
});
