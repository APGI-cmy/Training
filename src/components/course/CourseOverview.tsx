import Link from "next/link";
import { CourseProgressSummary } from "@/components/CourseProgressSummary";
import { LearningUnitCard } from "@/components/LearningUnitCard";
import type { Course } from "@/types/course";

export function CourseOverview({
  course,
  previewHref
}: {
  course: Course;
  previewHref?: string;
}) {
  return (
    <main>
      <section className="course-masthead">
        <div className="content-inner course-masthead-grid">
          <div>
            <p className="eyebrow">{course.level}</p>
            <h1>{course.title}</h1>
            <p>{course.description}</p>
            <p>
              This governed course overview uses the APGI learner route for access checks, saved
              progress and course-specific recovery.
            </p>
            <div className="button-row">
              <Link className="primary-button" href={`/learn/${course.slug}`}>
                Open learner course
              </Link>
              {previewHref ? (
                <Link className="secondary-button" href={previewHref}>
                  Preview as administrator
                </Link>
              ) : null}
            </div>
          </div>
          <CourseProgressSummary unitIds={course.units.map((unit) => unit.id)} />
        </div>
      </section>

      <section className="content-band">
        <div className="content-inner overview-grid">
          <div>
            <p className="eyebrow">Audience</p>
            <h2>Built for applied security decisions</h2>
            <p>{course.audience}</p>
          </div>
          <div>
            <p className="eyebrow">Structure</p>
            <h2>{course.duration}</h2>
            <ul className="plain-list">
              {course.integrationNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="content-band muted-band" aria-labelledby={`${course.slug}-units-heading`}>
        <div className="content-inner">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Learning units</p>
              <h2 id={`${course.slug}-units-heading`}>{course.title} pathway</h2>
              <p>Each unit opens through the governed learner route, not a raw published asset.</p>
            </div>
          </div>
          <div className="unit-grid">
            {course.units.map((unit) => (
              <LearningUnitCard key={unit.id} courseSlug={course.slug} unit={unit} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
