import 'server-only';
import {rows} from './company-structure';
import type {CourseClassification} from '@/lib/course-selection';

// Only load labels for the already-authorised courses supplied by the caller.
export async function courseClassifications(courseIds:string[]){
 const result=new Map<string,CourseClassification>();if(!courseIds.length)return result;
 const editions=await rows<{id:string;course_id:string;course_document:{classification?:{category:CourseClassification['scope'];industry?:string;clientName?:string};catalogueVisibility?:string}}>(`/rest/v1/course_editions?course_id=in.(${[...new Set(courseIds)].map(encodeURIComponent).join(',')})&state=eq.ready&select=id,course_id,course_document&order=edition_number.desc&limit=1000`);
 if(!editions.length)return result;
 const versions=await rows<{edition_id:string;snapshot:CourseClassification}>(`/rest/v1/cc_credit_versions?edition_id=in.(${editions.map(e=>e.id).join(',')})&select=edition_id,snapshot&order=created_at.desc&limit=1000`);
 for(const e of editions){if(result.has(e.course_id))continue;const saved=versions.find(v=>v.edition_id===e.id)?.snapshot,m=e.course_document.classification;
  if(saved)result.set(e.course_id,{scope:saved.scope,industry:saved.industry??m?.industry,clientName:saved.clientName??m?.clientName});
  else if(m)result.set(e.course_id,{scope:m.category,industry:m.industry,clientName:m.clientName});
  else if(e.course_document.catalogueVisibility==='client_specific')result.set(e.course_id,{scope:'client'});
 }
 return result;
}
