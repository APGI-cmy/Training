import { getCourseBySlug } from "@/lib/courses";
import type { Course, LearningUnit } from "@/types/course";

export interface CourseShellUnit {
  id: string;
  slug: string;
  legacySlug?: string;
  order: number;
  title: string;
  subtitle: string;
  duration: string;
  href: string;
}

export interface CourseShell {
  course: Course;
  units: CourseShellUnit[];
  firstUnit?: CourseShellUnit;
}

export function getCourseShell(courseSlug: string): CourseShell | undefined {
  const course = getCourseBySlug(courseSlug);

  if (!course) {
    return undefined;
  }

  const units = course.units
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((unit: LearningUnit) => ({
      id: unit.id,
      slug: unit.slug,
      legacySlug: unit.legacySlug,
      order: unit.order,
      title: unit.title,
      subtitle: unit.subtitle,
      duration: unit.duration,
      href: `/learn/${course.slug}/units/${unit.slug}`
    }));

  return {
    course,
    units,
    firstUnit: units[0]
  };
}
