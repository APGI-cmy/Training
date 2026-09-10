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
  const trainingHref = unit.trainingPath ? encodeAssetPath(unit.trainingPath) : undefined;
  const scormHref = unit.scormPath ? `/learn/${course.slug}/units/${unit.slug}/scorm` : undefined;
  const isScannexUnit = course.slug === "scannex-training-programme";
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
            <a href={originalHref}>{isScannexUnit ? "Open Scannex e-book" : "Open original unit"}</a>
          </div>
        </div>
      </section>

      <section className="content-band">
        <div className="content-inner objectives-layout">
          <CourseSidebar courseSlug={course.slug} units={units} activeUnitSlug={unit.slug} />
          <div className="media-stack">
            {isScannexUnit ? (
              <section aria-labelledby="scannex-resources-heading">
                <p className="eyebrow">Unit resources</p>
                <h2 id="scannex-resources-heading">Read, then practise</h2>
                <p>
                  Use the e-book for reference. The activities and quizzes apply the same material in
                  an interactive learning experience.
                </p>
                <div className="button-row">
                  <a className="secondary-button" href={originalHref}>
                    Open Scannex e-book
                  </a>
                  {scormHref ? (
                    <Link className="primary-button" href={scormHref}>
                      Open activities and quizzes
                    </Link>
                  ) : trainingHref ? (
                    <a className="primary-button" href={trainingHref}>
                      Open activities and quizzes
                    </a>
                  ) : (
                    <span>Activities and quizzes will appear here when this unit is published.</span>
                  )}
                </div>
              </section>
            ) : null}
            <figure className="media-item">
              <iframe
                title={`${unit.title} ${isScannexUnit ? "e-book" : "published unit"}`}
                src={embeddedSrc}
                loading="lazy"
                allowFullScreen
              />
              <figcaption>
                {isScannexUnit
                  ? "Embedded Scannex e-book. Use the link above if the embedded view is blocked."
                  : "Embedded published unit. Use the fallback link below if the embedded view is blocked."}
              </figcaption>
            </figure>
            <div className="button-row">
              <a className="primary-button" href={originalHref}>
                {isScannexUnit ? "Open e-book in a full window" : "Open expanded unit"}
              </a>
              {isScannexUnit && scormHref ? (
                <Link className="secondary-button" href={scormHref}>
                  Open activities and quizzes
                </Link>
              ) : isScannexUnit && trainingHref ? (
                <a className="secondary-button" href={trainingHref}>
                  Open activities and quizzes
                </a>
              ) : (
                <Link className="secondary-button" href={`/courses/${course.slug}/${unit.slug}`}>
                  Open legacy responsive unit
                </Link>
              )}
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
