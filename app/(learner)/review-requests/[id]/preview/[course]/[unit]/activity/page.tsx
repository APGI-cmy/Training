import {notFound} from 'next/navigation';
import {requestPreviewAccess} from '@/server/services/review-requests';
import {getUnitContent} from '@/lib/services/courses/get-unit-content';
import {LearningActivity} from '@/components/course/LearningActivity';
export const dynamic='force-dynamic';
export default async function Activity({params}:{params:Promise<{id:string;course:string;unit:string}>}){const {id,course,unit}=await params;let a;try{a=await requestPreviewAccess(id,course);}catch{notFound();}const content=getUnitContent(course,unit);if(!content?.unit.scormPath)notFound();const base=`/review-requests/${id}/preview/${course}`,preview={scope:`independent:${a.session.user.id}:${id}:${a.item.version}`,courseHref:base,unitBaseHref:base,returnHref:`/review-requests/${id}`,returnLabel:'Back to review request'};return <LearningActivity content={content} preview={preview}/>;}
