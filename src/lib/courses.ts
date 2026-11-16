import vpshrLevel0 from "@/data/vpshr-level-0.json";
import type { Course, LearningUnit } from "@/types/course";

export { encodeAssetPath } from "@/lib/asset-path";

import {courses} from "./course-catalogue";

export function getCourses(): Course[] {
  return courses;
}

export function getCourseBySlug(slug: string): Course | undefined {
  return courses.find((course) => course.slug === slug);
}

export function getVpshrLevel0Course(): Course {
  return vpshrLevel0 as Course;
}

export function normalizeUnitSlug(slug: string): string {
  const lowerSlug = slug.toLowerCase();
  const legacyMatch = lowerSlug.match(/^unit(\d+)$/);

  if (legacyMatch) {
    return `lu${legacyMatch[1]}`;
  }

  return lowerSlug;
}

export function getUnitBySlug(slug: string): LearningUnit | undefined {
  const normalizedSlug = normalizeUnitSlug(slug);

  return getVpshrLevel0Course().units.find(
    (unit) => unit.slug === normalizedSlug || unit.legacySlug === normalizedSlug
  );
}

export function getAdjacentUnits(unit: LearningUnit, course?: Course): {
  previous?: LearningUnit;
  next?: LearningUnit;
} {
  const owner = course ?? courses.find((candidate) => candidate.units.some((entry) => entry.id === unit.id));
  const units = owner?.units ?? [];
  const unitIndex = units.findIndex((candidate) => candidate.id === unit.id);

  return {
    previous: unitIndex > 0 ? units[unitIndex - 1] : undefined,
    next: unitIndex >= 0 && unitIndex < units.length - 1 ? units[unitIndex + 1] : undefined
  };
}

export function getUnitStaticParams(): { unitSlug: string }[] {
  return getVpshrLevel0Course().units.flatMap((unit) => {
    const params = [{ unitSlug: unit.slug }];

    if (unit.legacySlug) {
      params.push({ unitSlug: unit.legacySlug });
    }

    return params;
  });
}
