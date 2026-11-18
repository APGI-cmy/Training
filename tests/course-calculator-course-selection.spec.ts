import {describe,it,expect} from 'vitest';
import {defaultStructure,offerCourses,selectOfferCourses,quoteStructure,validateStructure,ROUTES} from '@/lib/pricing-structures';
import {emptyCourseFilter,matchesCourseFilter,monthlyLearnerCents} from '@/lib/course-selection';
import type {CostSchedule} from '@/lib/course-calculator';
import type {CreditCourse} from '@/lib/credit-course-metadata';
const cost:CostSchedule={id:'cost',currency:'USD',monthlyPoolCents:76035,activeLearners:30,newEnrolments:10,variableCents:0,processorBps:370,processorFixedCents:22,source:'Recorded cost basis',sourceDraftId:'source',rates:{public:250,industry:750,client:1500},floors:{public:500,industry:2500,client:5000},margins:{public:2500,industry:4000,client:5500}};
const courses:CreditCourse[]=Array.from({length:3},(_,i)=>({id:`credit${i}`,editionId:`edition${i}`,courseId:`course${i}`,title:`Course ${i}`,ownerId:'apgi',ownerIsApgi:true,scope:'public',hours:8*(i+1),minimumCents:0,currency:'USD',evidence:'Recorded learning workload'}));
const make=()=>defaultStructure(cost,courses,{id:'apgi',isApgi:true});
describe('Independent course selections for the four options',()=>{
 it('preserves existing proposals and quotes without option selections',()=>{const s=make(),before=JSON.stringify(s),quotes=ROUTES.map(r=>quoteStructure(s,r,r==='individual'?1:100));expect(offerCourses(s,'individual')).toEqual([courses[0]]);expect(offerCourses(s,'wallet')).toEqual(courses);expect(JSON.stringify(s)).toBe(before);expect(ROUTES.map(r=>quoteStructure(s,r,r==='individual'?1:100))).toEqual(quotes);});
 it('switches the individual course without silently changing the bulk bundle',()=>{const s=make(),bulk=quoteStructure(s,'seat_pack',100),next=selectOfferCourses(s,'individual',['edition2']);expect(quoteStructure(next,'individual',1).courses.map(c=>c.editionId)).toEqual(['edition2']);expect(quoteStructure(next,'seat_pack',100)).toEqual(bulk);expect(s.offers.individual.editionIds).toBeUndefined();});
 it('quotes one, two and three selected bulk courses with one protected platform pool',()=>{const s=make();const q=[1,2,3].map(n=>quoteStructure(selectOfferCourses(s,'seat_pack',courses.slice(0,n).map(c=>c.editionId)),'seat_pack',100));expect(q.map(x=>x.commercial!.lines.length)).toEqual([1,2,3]);expect(new Set(q.map(x=>x.result.platformCents)).size).toBe(1);expect(q[1].result.contentCents).toBeGreaterThan(q[0].result.contentCents);expect(q[2].result.contentCents).toBeGreaterThan(q[1].result.contentCents);expect(q.every(x=>x.commercial!.scheduledDiscountBps===500)).toBe(true);});
 it('binds wallet redemption to its own eligible courses, keeping paid value separate',()=>{const s=selectOfferCourses(make(),'wallet',['edition1']);const q=quoteStructure(s,'wallet',100);expect(q.courses.map(c=>c.editionId)).toEqual(['edition1']);expect(q.commercial!.balanceUnit).toBe('purchasing-credits');expect(q.result.contentCents).toBe(s.commercial!.walletCentsPerLearner*100);expect(q.input.courseCap).toBe(1);});
 it('quotes annual access only for its selected content and enforces the four-course cap',()=>{let s=selectOfferCourses(make(),'subscription',['edition1','edition2']);expect(quoteStructure(s,'subscription',100).courses.map(c=>c.editionId)).toEqual(['edition1','edition2']);s={...s,courses:Array.from({length:5},(_,i)=>({...courses[0],id:`v${i}`,editionId:`e${i}`}))};s.offers.subscription.editionIds=['e0','e1','e2','e3','e4'];s.offers.subscription.courseCap=5;expect(()=>validateStructure(s)).toThrow();});
 it.each([{ids:[]},{ids:['edition0','edition0']},{ids:['missing']}])('rejects empty, duplicated or ineligible selections $ids',({ids})=>{expect(()=>selectOfferCourses(make(),'seat_pack',ids)).toThrow(/distinct eligible/);});
 it('does not accept two individual courses or cap/selection mismatches',()=>{expect(()=>selectOfferCourses(make(),'individual',['edition0','edition1'])).toThrow(/exactly one/);const s=selectOfferCourses(make(),'wallet',['edition0']);s.offers.wallet.courseCap=2;expect(()=>validateStructure(s)).toThrow(/course cap/);});
});
describe('Course discovery filters',()=>{
 const all=[{title:'Public security',scope:'public' as const},{title:'Mining safety',scope:'industry' as const,industry:'Mining'},{title:'Telecom safety',scope:'industry' as const,industry:'Telecommunications'},{title:'Client training',scope:'client' as const,clientName:'Econet'}];
 it('combines categories using checkboxes and narrows only the selected category',()=>{const f={...emptyCourseFilter(),scopes:['public','industry'] as const as ('public'|'industry')[],industry:'Mining'};expect(all.filter(c=>matchesCourseFilter(c,f)).map(c=>c.title)).toEqual(['Public security','Mining safety']);});
 it('shows all courses after all categories are unticked, including retained filter values',()=>{expect(all.filter(c=>matchesCourseFilter(c,{...emptyCourseFilter(),industry:'Mining',clientName:'Other'}))).toHaveLength(4);});
 it('matches client names without creating access to unprovided courses',()=>{const f={...emptyCourseFilter(),scopes:['client'] as 'client'[],clientName:'  econet '};expect(all.filter(c=>matchesCourseFilter(c,f))).toEqual([all[3]]);f.clientName='New client';expect(all.filter(c=>matchesCourseFilter(c,f))).toEqual([]);});
 it('keeps missing labels explicit and does not guess unknown categories',()=>{expect(matchesCourseFilter({title:'Unknown'},{...emptyCourseFilter(),scopes:['public']})).toBe(false);expect(matchesCourseFilter({title:'Missing',scope:'industry'},{...emptyCourseFilter(),scopes:['industry'],industry:'Industry not recorded'})).toBe(true);});
});
describe('Monthly learner comparison',()=>{
 it.each([[27909,1,3,9303],[6920434,100,3,23068.11333333333],[3316890,100,12,2764.075]])('divides %i cents by actual places and access months',(total,n,months,expected)=>expect(monthlyLearnerCents(total,n,months)).toBeCloseTo(expected,8));
 it('does not round or mutate a quoted invoice',()=>{const q=quoteStructure(make(),'subscription',100),before=JSON.stringify(q);expect(monthlyLearnerCents(q.result.totalCents,100,12)*1200).toBeCloseTo(q.result.totalCents,8);expect(JSON.stringify(q)).toBe(before);});
 it('rejects zero learner or term denominators',()=>{expect(()=>monthlyLearnerCents(100,0,12)).toThrow();expect(()=>monthlyLearnerCents(100,1,0)).toThrow();});
});


describe('A hundred-course discovery pool',()=>{
 it('filters a large catalogue by category, industry, client and text without changing selected entitlements',()=>{
  const pool=Array.from({length:100},(_,i)=>({title:`Course ${i}`,scope:i<40?'public' as const:i<80?'industry' as const:'client' as const,industry:i<60?'Mining':'Telecommunications',clientName:i>=80?'NKS Capital':undefined}));
  const selected=new Set(['Course 5','Course 85']),before=JSON.stringify([...selected]);
  expect(pool.filter(c=>matchesCourseFilter(c,{...emptyCourseFilter(),scopes:['industry'],industry:'Mining'}))).toHaveLength(20);
  expect(pool.filter(c=>matchesCourseFilter(c,{...emptyCourseFilter(),scopes:['client'],clientName:'NKS Capital',search:'Course 85'}))).toHaveLength(1);
  expect(pool.filter(c=>matchesCourseFilter(c,{...emptyCourseFilter(),search:'Course 99'}))).toHaveLength(1);
  expect(JSON.stringify([...selected])).toBe(before);expect(pool.filter(c=>matchesCourseFilter(c,emptyCourseFilter()))).toHaveLength(100);
 });
});
