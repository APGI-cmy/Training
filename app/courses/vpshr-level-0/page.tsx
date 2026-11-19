import { CourseOverview } from "@/components/course/CourseOverview";
import { getVpshrLevel0Course } from "@/lib/courses";
import { coursePreviewEntry } from "@/server/services/course-preview";
import {getTenantPublishedCourseIds} from '@/server/services/tenant-courses';
import {notFound} from 'next/navigation';

const governedLearnerRouteExample = "/learn/{course.slug}";
const governedLearnerRouteLabel = "governed learner route";

export const metadata = {
  title: "VPSHR Level 0",
  description: "Foundational VPSHR learning units for APGI training."
};

export default async function VpshrLevel0Page() {
  const course = getVpshrLevel0Course();
  const published = await getTenantPublishedCourseIds();
  if (published !== null && !published.has(course.id)) notFound();

  const preview = await coursePreviewEntry(course.slug);
  return <CourseOverview course={course} previewHref={preview?.href} previewLabel={preview?.label} />;
}
