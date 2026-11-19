import {receivedPublishedShares} from '@/server/services/course-distribution';
import { requireAdminCoursePreview } from "@/server/services/course-preview";
import { PreviewCourseHome, PreviewNotice } from "@/components/course/PreviewProgress";
import Link from "next/link";
import { CoursePackageNotice } from "@/components/course/CoursePackageNotice";
export const dynamic = "force-dynamic";
export default async function AdminCoursePreviewPage({params}:{params:Promise<{courseSlug:string}>}) {
  const {courseSlug}=await params;
  const {shell,preview}=await requireAdminCoursePreview(courseSlug);
  const share=(await receivedPublishedShares()).find(s=>s.course_id===courseSlug);
  return <><PreviewNotice preview={preview}/><PreviewCourseHome shell={shell} preview={preview}/><section className="content-band"><div className="content-inner"><CoursePackageNotice course={shell.course}/><details><summary>Administrator tools</summary><div className="button-row">{share?<Link className="secondary-button" href={`/course-sharing#share-${share.id}`}>View shared published owner release</Link>:<Link className="secondary-button" href={`/course-reviews/new?course=${shell.course.slug}`}>Start content review and publication workflow</Link>}{courseSlug==="scannex-training-programme"?<Link className="secondary-button" href={`/admin/courses/${courseSlug}/viewer-lab`}>Manage Viewer</Link>:null}</div></details></div></section></>;
}
