import Link from "next/link";
import { CourseProgressSummary } from "@/components/CourseProgressSummary";
import { LearningUnitCard } from "@/components/LearningUnitCard";
import { getVpshrLevel0Course } from "@/lib/courses";

export const metadata = {
  title: "VPSHR Level 0",
  description: "Foundational VPSHR learning units for APGI training."
};

export default function VpshrLevel0Page() {
  const course = getVpshrLevel0Course();
  const firstUnit = course.units[0];

  return (
    <main>
      <section className="course-masthead">
        <div className="content-inner course-masthead-grid">
          <div>
            <p className="eyebrow">{course.level}</p>
            <h1>{course.title}</h1>
            <p>{course.description}</p>
            <div className="button-row">
              <Link className="primary-button" href={`/courses/${course.slug}/${firstUnit.slug}`}>
                Start course
              </Link>
              <a className="secondary-button" href={`${course.sourceRoot}/index.html`}>
                Open legacy landing
              </a>
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

      <section className="content-band muted-band" aria-labelledby="units-heading">
        <div className="content-inner">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Learning units</p>
              <h2 id="units-heading">VPSHR Level 0 pathway</h2>
            </div>
          </div>
          <div className="unit-grid">
            {course.units.map((unit) => (
              <LearningUnitCard key={unit.id} unit={unit} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
