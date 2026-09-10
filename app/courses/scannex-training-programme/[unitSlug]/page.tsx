import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  encodeAssetPath,
  getCourseUnitBySlug,
  getCourseUnitStaticParams,
  getScannexTrainingProgrammeCourse
} from "@/lib/courses";

const course = getScannexTrainingProgrammeCourse();

type UnitPageProps = {
  params: Promise<{
    unitSlug: string;
  }>;
};

export function generateStaticParams() {
  return getCourseUnitStaticParams(course.slug);
}

export async function generateMetadata({ params }: UnitPageProps): Promise<Metadata> {
  const { unitSlug } = await params;
  const unit = getCourseUnitBySlug(course.slug, unitSlug);

  if (!unit) {
    return { title: "Learning unit not found" };
  }

  return { title: `${unit.title} | ${course.title}`, description: unit.subtitle };
}

export default async function ScannexLearningUnitPage({ params }: UnitPageProps) {
  const { unitSlug } = await params;
  const unit = getCourseUnitBySlug(course.slug, unitSlug);

  if (!unit) notFound();

  const canonicalSlug = unit.legacySlug ?? unit.slug;
  if (unitSlug.toLowerCase() !== canonicalSlug.toLowerCase()) {
    permanentRedirect(`/courses/${course.slug}/${canonicalSlug}`);
  }

  const interventionSrc = unit.learningInterventionPath
    ? encodeAssetPath(unit.learningInterventionPath)
    : undefined;
  const eBookSrc = encodeAssetPath(unit.publishedPath);
  const primarySrc = interventionSrc ?? eBookSrc;
  const primaryLabel = interventionSrc ? "Learning intervention" : "E-book";

  return (
    <main className="unit-embed-page">
      <header className="unit-embed-header">
        <div>
          <p className="unit-embed-label">LU {unit.order} · {primaryLabel}</p>
          <h1>{unit.title}</h1>
        </div>
        <div className="unit-embed-links">
          <Link href={`/courses/${course.slug}`}>All learning units</Link>
          {interventionSrc && <a href={eBookSrc}>Open e-book</a>}
          <a href={primarySrc}>Open {primaryLabel.toLowerCase()}</a>
        </div>
      </header>
      <iframe className="unit-embed-frame" src={primarySrc} title={`${unit.title} — ${primaryLabel}`} loading="eager" />
    </main>
  );
}
