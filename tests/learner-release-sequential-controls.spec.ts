import {describe,it,expect} from 'vitest';
import {emptySequence,sequenceRecordValid,sequenceStepAllowed,sequenceSummaryAllowed,sequenceKey} from '@/lib/learning-sequence';
describe('Authored activity sequencing',()=>{
 it('starts with all sections and the summary locked until Begin',()=>{const state=emptySequence();expect(sequenceStepAllowed(state,0,4)).toBe(false);expect(sequenceSummaryAllowed(state,4)).toBe(false);});
 it('opens only the next ordered section while preserving backward access',()=>{const state={begun:true,through:1,summary:false};expect(sequenceStepAllowed(state,0,4)).toBe(true);expect(sequenceStepAllowed(state,1,4)).toBe(true);expect(sequenceStepAllowed(state,2,4)).toBe(true);expect(sequenceStepAllowed(state,3,4)).toBe(false);expect(sequenceSummaryAllowed(state,4)).toBe(false);});
 it('opens the summary only after all required sections',()=>{expect(sequenceSummaryAllowed({begun:true,through:3,summary:false},4)).toBe(true);});
 it('retains an existing valid completion without synthesising step history',()=>{const old=emptySequence();expect(sequenceStepAllowed(old,3,4,true)).toBe(true);expect(sequenceSummaryAllowed(old,4,true)).toBe(true);expect(old).toEqual(emptySequence());});
 it.each([-1,4,12])('rejects an out-of-range step %s',index=>expect(sequenceStepAllowed({begun:true,through:3,summary:true},index,4,true)).toBe(false));
 const row={document:'/courses/Tiger%20kidnapping_telecommunications/LU1/res/data/wo4/index.html',profile:'indexed-stage-v1',steps:4,begun:true,through:0,summary:false};
 it('accepts a bounded progress record without any qualification fields',()=>expect(sequenceRecordValid(row)).toBe(true));
 it.each([{through:4},{through:1.5},{steps:0},{steps:121},{begun:false},{summary:true},{document:'https://elsewhere.test/a.html'},{document:'/courses/a.html?token=secret'},{document:'/courses/../a.html\u0000'}])('rejects malformed progress %o',patch=>expect(sequenceRecordValid({...row,...patch})).toBe(false));
 it('keeps profiles and authored step versions separate',()=>{expect(sequenceKey(row)).not.toBe(sequenceKey({...row,steps:5}));expect(sequenceKey(row)).not.toBe(sequenceKey({...row,profile:'states-v1'}));});
});
