import {notFound} from 'next/navigation';
import {requestPreviewAccess} from '@/server/services/review-requests';
import {getCourseShell} from '@/lib/services/courses/get-course-shell';
import {getUnitContent} from '@/lib/services/courses/get-unit-content';
import {UnitViewer} from '@/components/course/UnitViewer';
import {PreviewNotice} from '@/components/course/PreviewProgress';
import Link from 'next/link';
export const dynamic='force-dynamic';
export default async function RequestUnitPreview({params}:{params:Promise<{id:string;course:string;unit:string}>}){const {id,course,unit}=await params;let a;try{a=await requestPreviewAccess(id,course);}catch{notFound();}const item=a.request.snapshot.items.find(i=>i.courseId===course),shell=getCourseShell(course),content=getUnitContent(course,unit);if(!item||!shell||!content)notFound();const base=`/review-requests/${id}/preview/${course}`,preview={scope:`independent:${a.session.user.id}:${id}:${item.version}`,courseHref:base,unitBaseHref:base,returnHref:`/review-requests/${id}`,returnLabel:'Back to review request'};return <><PreviewNotice preview={preview}/><UnitViewer content={content} units={shell.units} preview={preview}/><p className="content-inner"><Link href={`/review-requests/${id}`}>Record findings and your review response</Link></p></>;}
