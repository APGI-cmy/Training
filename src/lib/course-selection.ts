import type {CourseScope} from './course-calculator';

export type CourseClassification={scope?:CourseScope;industry?:string;clientName?:string};
export type CourseFilter={scopes:CourseScope[];industry:string;clientName:string;search:string};
export const emptyCourseFilter=():CourseFilter=>({scopes:[],industry:'',clientName:'',search:''});
export const SCOPE_NAMES:Record<CourseScope,string>={public:'Public',industry:'Industry specific',client:'Client specific'};
const normal=(s:string)=>s.trim().toLocaleLowerCase();
export function matchesCourseFilter(course:CourseClassification&{title:string},filter:CourseFilter){
 if(filter.scopes.length&&(!course.scope||!filter.scopes.includes(course.scope)))return false;
 if(filter.scopes.includes('industry')&&filter.industry&&course.scope==='industry'&&normal(course.industry??'Industry not recorded')!==normal(filter.industry))return false;
 if(filter.scopes.includes('client')&&filter.clientName&&course.scope==='client'&&normal(course.clientName??'Client not recorded')!==normal(filter.clientName))return false;
 return !filter.search||normal(`${course.title} ${course.industry??''} ${course.clientName??''}`).includes(normal(filter.search));
}
export function classificationLabel(c:CourseClassification){return `${c.scope?SCOPE_NAMES[c.scope]:'Category not recorded'}${c.scope==='industry'?` · ${c.industry||'Industry not recorded'}`:c.scope==='client'?` · ${c.clientName||'Client not recorded'}`:''}`;}
// Comparison display only. Never round or modify the invoice being approved.
export function monthlyLearnerCents(total:number,learners:number,months:number){
 if(!Number.isSafeInteger(total)||total<0||!Number.isSafeInteger(learners)||learners<1||!Number.isSafeInteger(months)||months<1)throw Error('Check the total, learner count and access months.');
 return total/learners/months;
}
