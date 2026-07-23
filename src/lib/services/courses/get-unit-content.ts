import { getAdjacentUnits, getCourseBySlug, normalizeUnitSlug } from "@/lib/courses";
import type { Course, LearningUnit } from "@/types/course";

export interface UnitContent {
  course: Course;
  unit: LearningUnit;
  previous?: LearningUnit;
  next?: LearningUnit;
  originalContentHref: string;
  embeddedContentHref?: string;
}

export function getUnitContent(courseSlug: string, unitSlug: string): UnitContent | undefined {
  const course = getCourseBySlug(courseSlug);

  if (!course) {
    return undefined;
  }

  const normalizedSlug = normalizeUnitSlug(unitSlug);
  const unit = course.units.find(
    (candidate) => candidate.slug === normalizedSlug || candidate.legacySlug === normalizedSlug
  );

  if (!unit) {
    return undefined;
  }

  const { previous, next } = getAdjacentUnits(unit, course);
  const embed = unit.media.find((media) => media.kind === "embed");

  return {
    course,
    unit,
    previous,
    next,
    originalContentHref: unit.publishedPath,
    embeddedContentHref: embed?.src ?? unit.publishedPath
  };
}
