import {describe,it,expect} from 'vitest';
import {learningResponse} from '@/lib/learning-save';
describe('Learning save recovery responses',()=>{
 it.each([401,403,409,500,503])('never reports HTTP %s as saved',async status=>{
  await expect(learningResponse(Response.json({error:'Rejected'},{status}))).rejects.toHaveProperty('code',status===401?'session_required':'save_failed');
 });
 it('distinguishes a changed account from a connection failure',async()=>{
  await expect(learningResponse(Response.json({code:'learner_changed'},{status:409}))).rejects.toHaveProperty('code','learner_changed');
  const ok=Response.json({ok:true});expect(await learningResponse(ok)).toBe(ok);
 });
});
