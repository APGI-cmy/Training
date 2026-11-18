'use server';
import {revalidatePath} from 'next/cache';
import {validId,formText,type StructureState} from '@/lib/company-structure';
import {calculatorAccess,calculatorCourses} from '@/server/services/course-calculator';
import {rows,write} from '@/server/services/company-structure';

export async function saveCourseClassification(_:StructureState,form:FormData):Promise<StructureState>{try{
 const a=await calculatorAccess(validId(formText(form,'company',36,36))),id=validId(formText(form,'credit',36,36));
 const c=(await calculatorCourses(a.company.id,a.principal)).courses.find(c=>c.id===id);
 if(!c||!a.principal&&c.ownerId!==a.company.id)throw Error('Only the course owner or a platform principal may label this course. Refresh if the course record changed.');
 const industry=formText(form,'industry',0,120).trim(),clientName=formText(form,'client_name',0,120).trim();
 if(c.scope==='industry'&&industry.length<2||c.scope==='client'&&clientName.length<2)throw Error('Enter the industry or client name for this category.');
 const prior=(await rows<{snapshot:Record<string,unknown>}>(`/rest/v1/cc_credit_versions?id=eq.${id}&select=snapshot&limit=1`))[0];if(!prior)throw Error('Course metadata is unavailable.');
 await write('/rest/v1/cc_credit_versions',{edition_id:c.editionId,owner_id:c.ownerId,created_by:a.session.user.id,snapshot:{...prior.snapshot,...(c.scope==='industry'?{industry}:c.scope==='client'?{clientName}:{})}});
 for(const path of ['/course-calculator','/dashboard'])revalidatePath(path);
 return {success:'Course label saved as a new metadata version. Earlier prices, quotes, course content and learner records are preserved.'};
}catch(e){return {error:e instanceof Error?e.message:'The course label could not be saved.'};}}
