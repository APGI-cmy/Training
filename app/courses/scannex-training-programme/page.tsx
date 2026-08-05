import { CourseOverview } from "@/components/course/CourseOverview";
import { getCourseBySlug } from "@/lib/courses";

export const metadata = {
  title: "Scannex Training Programme",
  description: "Published Scannex operator and reviewer learning pathway."
};

export default function ScannexCoursePage() {
  const course = getCourseBySlug("scannex-training-programme");

  if (!course) return null;

  return <CourseOverview course={course} previewHref={`/admin/courses/${course.slug}/preview`} />;
}
