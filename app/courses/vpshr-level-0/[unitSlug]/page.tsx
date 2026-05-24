import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { encodeAssetPath, getUnitBySlug, getUnitStaticParams } from "@/lib/courses";

type UnitPageProps = {
  params: Promise<{
    unitSlug: string;
  }>;
};

export function generateStaticParams() {
  return getUnitStaticParams();
}

export async function generateMetadata({ params }: UnitPageProps): Promise<Metadata> {
  const { unitSlug } = await params;
  const unit = getUnitBySlug(unitSlug);

  if (!unit) {
    return {
      title: "Learning unit not found"
    };
  }

  return {
    title: unit.title,
    description: unit.subtitle
  };
}

export default async function LearningUnitPage({ params }: UnitPageProps) {
  const { unitSlug } = await params;
  const unit = getUnitBySlug(unitSlug);

  if (!unit) {
    notFound();
  }

  const canonicalSlug = unit.legacySlug ?? unit.slug;
  const requestedSlug = unitSlug.toLowerCase();

  if (requestedSlug !== canonicalSlug.toLowerCase()) {
    permanentRedirect(`/courses/vpshr-level-0/${canonicalSlug}`);
  }

  const iframeSrc = encodeAssetPath(unit.publishedPath);

  return (
    <main className="unit-embed-page">
      <header className="unit-embed-header">
        <div>
          <p className="unit-embed-label">{unit.order === 0 ? "Introduction" : `Unit ${unit.order}`}</p>
          <h1>{unit.title}</h1>
        </div>
        <div className="unit-embed-links">
          <Link href="/courses/vpshr-level-0">All URLs</Link>
          <a href={iframeSrc}>Open package</a>
        </div>
      </header>
      <iframe className="unit-embed-frame" src={iframeSrc} title={unit.title} loading="eager" />
    </main>
  );
}
