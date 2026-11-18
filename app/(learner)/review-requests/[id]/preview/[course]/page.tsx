import {notFound} from 'next/navigation';
import {requestPreviewAccess} from '@/server/services/review-requests';
import {getCourseShell} from '@/lib/services/courses/get-course-shell';
import {PreviewCourseHome,PreviewNotice} from '@/components/course/PreviewProgress';
export const dynamic='force-dynamic';
export default async function RequestCoursePreview({params}:{params:Promise<{id:string;course:string}>}){const {id,course}=await params;let a;try{a=await requestPreviewAccess(id,course);}catch{notFound();}const item=a.request.snapshot.items.find(i=>i.courseId===course),shell=getCourseShell(course);if(!item||!shell)notFound();const base=`/review-requests/${id}/preview/${course}`,preview={scope:`independent:${a.session.user.id}:${id}:${item.version}`,courseHref:base,unitBaseHref:base,returnHref:`/review-requests/${id}`,returnLabel:'Back to review request'};return <><PreviewNotice preview={preview}/><PreviewCourseHome shell={shell} preview={preview}/></>;}
