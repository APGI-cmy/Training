import Link from "next/link";
import { getCourseBySlug } from "@/lib/courses";

export const metadata = {
  title: "Scannex Training Programme",
  description: "Published Scannex operator and reviewer learning pathway."
};

export default function ScannexCoursePage() {
  const course = getCourseBySlug("scannex-training-programme");

  if (!course) return null;

  return (
    <main>
      <section className="course-masthead">
        <div className="content-inner">
          <p className="eyebrow">{course.level}</p>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
          <div className="button-row">
            <Link className="primary-button" href={`/learn/${course.slug}`}>Open learner course</Link>
            <a className="secondary-button" href={`${course.sourceRoot}/index.html`}>Open published programme</a>
          </div>
        </div>
      </section>

      <section className="content-band" aria-labelledby="scannex-units-heading">
        <div className="content-inner">
          <h2 id="scannex-units-heading">Published learning units</h2>
          <ul className="plain-list">
            {course.units.map((unit) => (
              <li key={unit.id}>
                <a href={unit.publishedPath}>{unit.order}. {unit.title}</a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
