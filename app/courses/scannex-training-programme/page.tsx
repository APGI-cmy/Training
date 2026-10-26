import { CourseOverview } from "@/components/course/CourseOverview";
import { getCourseBySlug } from "@/lib/courses";
import { coursePreviewEntry } from "@/server/services/course-preview";

export const metadata = {
  title: "Scannex Training Programme",
  description: "Published Scannex operator and reviewer learning pathway."
};

export default async function ScannexCoursePage() {
  const course = getCourseBySlug("scannex-training-programme");

  if (!course) return null;

  const preview = await coursePreviewEntry(course.slug);
  return <CourseOverview course={course} previewHref={preview?.href} previewLabel={preview?.label} />;
}
