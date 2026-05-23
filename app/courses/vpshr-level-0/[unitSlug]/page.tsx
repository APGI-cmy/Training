import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentSlides } from "@/components/ContentSlides";
import { MediaPanel } from "@/components/MediaPanel";
import { ProgressTracker } from "@/components/ProgressTracker";
import { QuizEngine } from "@/components/QuizEngine";
import { SurveyEngine } from "@/components/SurveyEngine";
import { UnitNavigation } from "@/components/UnitNavigation";
import { getAdjacentUnits, getUnitBySlug, getUnitStaticParams } from "@/lib/courses";

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

  const { previous, next } = getAdjacentUnits(unit);

  return (
    <main>
      <section className="unit-masthead">
        <div className="content-inner">
          <Link className="back-link" href="/courses/vpshr-level-0">
            Back to course
          </Link>
          <p className="eyebrow">{unit.order === 0 ? "Orientation" : `Learning Unit ${unit.order}`}</p>
          <h1>{unit.title}</h1>
          <p>{unit.subtitle}</p>
          <div className="unit-meta">
            <span>{unit.duration}</span>
            <a href={unit.publishedPath}>Original published unit</a>
          </div>
        </div>
      </section>

      <section className="content-band">
        <div className="content-inner objectives-layout">
          <div>
            <p className="eyebrow">Objectives</p>
            <h2>What this unit covers</h2>
            <ol className="objective-list">
              {unit.objectives.map((objective) => (
                <li key={objective}>{objective}</li>
              ))}
            </ol>
          </div>
          <ProgressTracker unit={unit} />
        </div>
      </section>

      <MediaPanel media={unit.media} />
      <ContentSlides slides={unit.slides} />
      <QuizEngine unitId={unit.id} questions={unit.quiz} />
      <SurveyEngine unitId={unit.id} prompts={unit.survey} />

      <section className="content-band">
        <div className="content-inner">
          <p className="eyebrow">Summary</p>
          <h2>Key takeaways</h2>
          <ul className="summary-list">
            {unit.summary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <UnitNavigation previous={previous} next={next} />
        </div>
      </section>
    </main>
  );
}
