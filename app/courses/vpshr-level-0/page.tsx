import { CourseOverview } from "@/components/course/CourseOverview";
import { getVpshrLevel0Course } from "@/lib/courses";

export const governedLearnerRouteExample = "/learn/{course.slug}";
export const governedLearnerRouteLabel = "governed learner route";

export const metadata = {
  title: "VPSHR Level 0",
  description: "Foundational VPSHR learning units for APGI training."
};

export default function VpshrLevel0Page() {
  const course = getVpshrLevel0Course();

  return <CourseOverview course={course} previewHref={`/admin/courses/${course.slug}/preview`} />;
}
