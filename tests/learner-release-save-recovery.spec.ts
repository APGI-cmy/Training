import {describe,it,expect} from 'vitest';
import {learningResponse} from '@/lib/learning-save';
import {learningActivityPath} from '@/lib/learning-activity-path';
describe('Learning save recovery responses',()=>{
 it.each([401,403,409,500,503])('never reports HTTP %s as saved',async status=>{
  await expect(learningResponse(Response.json({error:'Rejected'},{status}))).rejects.toHaveProperty('code',status===401?'session_required':'save_failed');
 });
 it('uses the same authored activity key inside a protected edition, without accepting arbitrary URLs',()=>{
  const path='/courses/Tiger%20kidnapping_telecommunications/LU1/res/data/wo1/index.html';
  expect(learningActivityPath('/api/editions/13a47f6d-695a-49b8-b0b4-9c6d5e664941/assets'+path)).toBe(path);
  expect(learningActivityPath(path)).toBe(path);expect(learningActivityPath('/api/editions/other/assets'+path)).toBeNull();expect(learningActivityPath('https://elsewhere.test'+path)).toBeNull();
 });
 it('distinguishes a changed account from a connection failure',async()=>{
  await expect(learningResponse(Response.json({code:'learner_changed'},{status:409}))).rejects.toHaveProperty('code','learner_changed');
  const ok=Response.json({ok:true});expect(await learningResponse(ok)).toBe(ok);
 });
});
