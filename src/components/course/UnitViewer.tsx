import Link from "next/link";
import { encodeAssetPath } from "@/lib/courses";
import { CourseSidebar } from "@/components/course/CourseSidebar";
import type { CourseShellUnit } from "@/lib/services/courses/get-course-shell";
import type { UnitContent } from "@/lib/services/courses/get-unit-content";
import { recordProgressEvent } from "@/server/actions/progress/record-progress-event";

export function UnitViewer({
  content,
  units
}: {
  content: UnitContent;
  units: CourseShellUnit[];
}) {
  const { course, unit, previous, next, embeddedContentHref, originalContentHref } = content;
  const activeUnit = units.find((candidate) => candidate.id === unit.id);
  const embeddedSrc = embeddedContentHref ? encodeAssetPath(embeddedContentHref) : undefined;
  const originalHref = encodeAssetPath(originalContentHref);
  const isCompleted = activeUnit?.isCompleted ?? false;

  const completeUnit = recordProgressEvent.bind(null, {
    courseSlug: course.slug,
    unitSlug: unit.slug,
    eventType: "unit_completed"
  });

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
            <span>{isCompleted ? "Completed" : "Opened"}</span>
            <a href={originalHref}>Open original unit</a>
          </div>
        </div>
      </section>

      <section className="content-band">
        <div className="content-inner objectives-layout">
          <CourseSidebar courseSlug={course.slug} units={units} activeUnitSlug={unit.slug} />
          <div className="media-stack">
            <figure className="media-item">
              <iframe
                title={`${unit.title} published unit`}
                src={embeddedSrc}
                loading="lazy"
                allowFullScreen
              />
              <figcaption>
                Embedded published unit. Use the fallback link below if the embedded view is blocked.
              </figcaption>
            </figure>
            <div className="button-row">
              <a className="primary-button" href={originalHref}>
                Open expanded unit
              </a>
              <Link className="secondary-button" href={`/courses/${course.slug}/${unit.slug}`}>
                Open legacy responsive unit
              </Link>
            </div>
            <form action={completeUnit}>
              <button className="primary-button" type="submit" disabled={isCompleted}>
                {isCompleted ? "Unit completed" : "Mark unit complete"}
              </button>
            </form>
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
