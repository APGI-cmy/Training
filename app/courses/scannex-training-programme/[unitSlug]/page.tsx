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
    return {
      title: "Learning unit not found"
    };
  }

  return {
    title: `${unit.title} | ${course.title}`,
    description: unit.subtitle
  };
}

export default async function ScannexLearningUnitPage({ params }: UnitPageProps) {
  const { unitSlug } = await params;
  const unit = getCourseUnitBySlug(course.slug, unitSlug);

  if (!unit) {
    notFound();
  }

  const canonicalSlug = unit.legacySlug ?? unit.slug;
  const requestedSlug = unitSlug.toLowerCase();

  if (requestedSlug !== canonicalSlug.toLowerCase()) {
    permanentRedirect(`/courses/${course.slug}/${canonicalSlug}`);
  }

  const iframeSrc = encodeAssetPath(unit.publishedPath);

  return (
    <main className="unit-embed-page">
      <header className="unit-embed-header">
        <div>
          <p className="unit-embed-label">LU {unit.order}</p>
          <h1>{unit.title}</h1>
        </div>
        <div className="unit-embed-links">
          <Link href={`/courses/${course.slug}`}>All URLs</Link>
          <a href={iframeSrc}>Open package</a>
        </div>
      </header>
      <iframe className="unit-embed-frame" src={iframeSrc} title={unit.title} loading="eager" />
    </main>
  );
}
