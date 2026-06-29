import Link from "next/link";
import { CourseSidebar } from "@/components/course/CourseSidebar";
import type { CourseShellUnit } from "@/lib/services/courses/get-course-shell";
import type { UnitContent } from "@/lib/services/courses/get-unit-content";

export function UnitViewer({
  content,
  units
}: {
  content: UnitContent;
  units: CourseShellUnit[];
}) {
  const { course, unit, previous, next, embeddedContentHref, originalContentHref } = content;

  return (
    <main>
      <section className="unit-masthead">
        <div className="content-inner">
          <Link className="back-link" href={`/learn/${course.slug}`}>
            Back to course shell
          </Link>
          <p className="eyebrow">{unit.order === 0 ? "Orientation" : `Learning Unit ${unit.order}`}</p>
          <h1>{unit.title}</h1>
          <p>{unit.subtitle}</p>
          <div className="unit-meta">
            <span>{unit.duration}</span>
            <a href={originalContentHref}>Open original unit</a>
          </div>
        </div>
      </section>

      <section className="content-band">
        <div className="content-inner objectives-layout">
          <CourseSidebar courseSlug={course.slug} units={units} activeUnitSlug={unit.slug} />
          <div className="media-stack">
            <figure className="media-item">
              <iframe title={`${unit.title} published unit`} src={embeddedContentHref} />
              <figcaption>
                Embedded published unit. Use the fallback link below if the embedded view is blocked.
              </figcaption>
            </figure>
            <div className="button-row">
              <a className="primary-button" href={originalContentHref}>
                Open expanded unit
              </a>
              <Link className="secondary-button" href={`/courses/${course.slug}/${unit.slug}`}>
                Open legacy responsive unit
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="content-band muted-band">
        <div className="content-inner">
          <p className="eyebrow">Navigation</p>
          <div className="unit-navigation">
            {previous ? (
              <Link className="secondary-button" href={`/learn/${course.slug}/units/${previous.slug}`}>
                Previous: {previous.title}
              </Link>
            ) : <span />}
            {next ? (
              <Link className="primary-button" href={`/learn/${course.slug}/units/${next.slug}`}>
                Next: {next.title}
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
