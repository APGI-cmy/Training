import { encodeAssetPath, getCourseBySlug } from "@/lib/courses";
import { getNextLearningAction, type NextLearningAction } from "@/lib/services/completion/get-next-learning-action";
import type { LearnerProgressSnapshot } from "@/lib/services/progress/get-learner-progress";
import type { Course, LearningUnit } from "@/types/course";

export interface CourseShellUnit {
  id: string;
  slug: string;
  legacySlug?: string;
  order: number;
  title: string;
  subtitle: string;
  duration: string;
  assetHref: string;
  href: string;
  isOpened: boolean;
  isCompleted: boolean;
}

export interface CourseShell {
  course: Course;
  units: CourseShellUnit[];
  firstUnit?: CourseShellUnit;
  completedUnits: number;
  progressPercent: number;
  nextAction?: NextLearningAction;
}

export function getCourseShell(
  courseSlug: string,
  progress?: LearnerProgressSnapshot
): CourseShell | undefined {
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
      assetHref: encodeAssetPath(unit.publishedPath),
      href: `/learn/${course.slug}/units/${unit.slug}`,
      isOpened: progress?.openedUnitIds.has(unit.id) ?? false,
      isCompleted: progress?.completedUnitIds.has(unit.id) ?? false
    }));

  const completedUnits = units.filter((unit) => unit.isCompleted).length;
  const progressPercent = units.length === 0 ? 0 : Math.round((completedUnits / units.length) * 100);

  return {
    course,
    units,
    firstUnit: units[0],
    completedUnits,
    progressPercent,
    nextAction: getNextLearningAction(units)
  };
}
