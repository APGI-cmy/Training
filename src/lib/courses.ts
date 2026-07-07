import scannexTrainingProgramme from "@/data/scannex-training-programme.json";
import vpshrLevel0 from "@/data/vpshr-level-0.json";
import type { Course, LearningUnit } from "@/types/course";

const courses = [vpshrLevel0 as Course, scannexTrainingProgramme as Course];

export function getCourses(): Course[] {
  return courses;
}

export function getCourseBySlug(slug: string): Course | undefined {
  return courses.find((course) => course.slug === slug);
}

export function getVpshrLevel0Course(): Course {
  return vpshrLevel0 as Course;
}

export function getScannexTrainingProgrammeCourse(): Course {
  return scannexTrainingProgramme as Course;
}

export function normalizeUnitSlug(slug: string): string {
  const lowerSlug = slug.toLowerCase();
  const legacyMatch = lowerSlug.match(/^unit(\d+)$/);

  if (legacyMatch) {
    return `lu${legacyMatch[1]}`;
  }

  return lowerSlug;
}

export function getCourseUnitBySlug(courseSlug: string, slug: string): LearningUnit | undefined {
  const course = getCourseBySlug(courseSlug);
  const normalizedSlug = normalizeUnitSlug(slug);

  return course?.units.find(
    (unit) => unit.slug === normalizedSlug || unit.legacySlug === normalizedSlug
  );
}

export function getUnitBySlug(slug: string): LearningUnit | undefined {
  return getCourseUnitBySlug("vpshr-level-0", slug);
}

export function getAdjacentUnitsForCourse(courseSlug: string, unit: LearningUnit): {
  previous?: LearningUnit;
  next?: LearningUnit;
} {
  const units = getCourseBySlug(courseSlug)?.units ?? [];
  const unitIndex = units.findIndex((candidate) => candidate.id === unit.id);

  return {
    previous: unitIndex > 0 ? units[unitIndex - 1] : undefined,
    next: unitIndex >= 0 && unitIndex < units.length - 1 ? units[unitIndex + 1] : undefined
  };
}

export function getAdjacentUnits(unit: LearningUnit): {
  previous?: LearningUnit;
  next?: LearningUnit;
} {
  return getAdjacentUnitsForCourse("vpshr-level-0", unit);
}

export function getCourseUnitStaticParams(courseSlug: string): { unitSlug: string }[] {
  return (
    getCourseBySlug(courseSlug)?.units.flatMap((unit) => {
      const params = [{ unitSlug: unit.slug }];

      if (unit.legacySlug) {
        params.push({ unitSlug: unit.legacySlug });
      }

      return params;
    }) ?? []
  );
}

export function getUnitStaticParams(): { unitSlug: string }[] {
  return getCourseUnitStaticParams("vpshr-level-0");
}

export function encodeAssetPath(path: string): string {
  return path
    .split("/")
    .map((segment, index) => (index === 0 ? segment : encodeURIComponent(segment)))
    .join("/");
}
