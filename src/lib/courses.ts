import vpshrLevel0 from "@/data/vpshr-level-0.json";
import type { Course, LearningUnit } from "@/types/course";

const scannexSourceRoot = "/courses/Scannex%20Training%20Programme";

function scannexUnit(order: number, folder: string, title: string, subtitle: string): LearningUnit {
  const publishedPath = `${scannexSourceRoot}/${encodeURIComponent(folder)}/index.html`;
  return {
    id: `scannex-lu-${order}`,
    slug: `lu${order}`,
    order,
    title,
    subtitle,
    duration: "Self-paced",
    assetBase: `${scannexSourceRoot}/${encodeURIComponent(folder)}`,
    publishedPath,
    objectives: [],
    media: [{ kind: "embed", title, src: publishedPath }],
    slides: [],
    quiz: [],
    survey: [],
    summary: []
  };
}

const scannexTrainingProgramme: Course = {
  id: "scannex-training-programme",
  slug: "scannex-training-programme",
  title: "Scannex Training Programme",
  level: "Operator programme",
  description: "Professional Scannex viewing and decision training delivered through governed learning units.",
  audience: "Authorized Scannex operators and reviewers",
  duration: "8 learning units",
  sourceRoot: scannexSourceRoot,
  integrationNotes: [
    "Eight Scannex learning units are published in the repository.",
    "Governed learner access is controlled through ALP enrolment state."
  ],
  units: [
    scannexUnit(1, "LU 1 - Introduction & The Case for Scannex", "Introduction and the Case for Scannex", "Programme orientation and operational purpose"),
    scannexUnit(2, "LU 2 - The X-ray", "The X-ray", "X-ray principles and image formation"),
    scannexUnit(3, "LU 3 - Radiation Safety & International Standards", "Radiation Safety and International Standards", "Safe and compliant operation"),
    scannexUnit(4, "LU 4 - The Legal & Human Rights Framework", "The Legal and Human Rights Framework", "Lawful, proportionate and respectful screening"),
    scannexUnit(5, "LU 5 - The Scannex System", "The Scannex System", "System components and operating context"),
    scannexUnit(6, "LU 6 - The Viewing System", "The Viewing System", "Viewer controls and systematic examination"),
    scannexUnit(7, "LU 7 - Image Interpretation & Detection", "Image Interpretation and Detection", "Recognition, comparison and decision support"),
    scannexUnit(8, "LU 8 Human Anatomy for the operator", "Human Anatomy for the Operator", "Anatomical orientation for professional viewing")
  ]
};

const courses: Course[] = [vpshrLevel0 as Course, scannexTrainingProgramme];

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

function decodeAssetSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function encodeAssetPath(path: string): string {
  return path
    .split("/")
    .map((segment, index) => (index === 0 ? segment : encodeURIComponent(decodeAssetSegment(segment))))
    .join("/");
}
