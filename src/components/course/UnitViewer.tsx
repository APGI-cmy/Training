import Link from "next/link";
import { encodeAssetPath } from "@/lib/courses";
import { ScormPlayer } from "@/components/course/ScormPlayer";
import { UnitResources } from "@/components/course/UnitResources";
import type { CourseShellUnit } from "@/lib/services/courses/get-course-shell";
import type { UnitContent } from "@/lib/services/courses/get-unit-content";
import { recordProgressEvent } from "@/server/actions/progress/record-progress-event";
import { ViewerLabNotice } from "@/components/course/ViewerLabNotice";
import type { ViewerLabAvailability } from "@/lib/services/viewer-lab/viewer-lab-settings";

export function UnitViewer({
  content,
  units,
  viewerAvailability
}: {
  content: UnitContent;
  units: CourseShellUnit[];
  viewerAvailability?: ViewerLabAvailability;
}) {
  const { course, unit, previous, next, embeddedContentHref, originalContentHref } = content;
  const activeUnit = units.find((candidate) => candidate.id === unit.id);
  const embeddedSrc = embeddedContentHref ? encodeAssetPath(embeddedContentHref) : undefined;
  const originalHref = encodeAssetPath(originalContentHref);
  const scormLaunchSrc = unit.scormPath ? encodeAssetPath(unit.scormPath) : undefined;
  const isScannexUnit = course.slug === "scannex-training-programme";
  const isPracticalAssessment = Boolean(unit.practicalAssessment);
  const isCompleted = activeUnit?.isCompleted ?? false;

  const completeUnit = recordProgressEvent.bind(null, {
    courseSlug: course.slug,
    unitSlug: unit.slug,
    eventType: "unit_completed"
  });

  return (
    <main>
      {viewerAvailability?.appliesToUnit ? <ViewerLabNotice courseSlug={course.slug} unitSlug={unit.slug} availability={viewerAvailability} /> : null}
      <section className="unit-masthead">
        <div className="content-inner">
          <Link className="back-link" href={`/learn/${course.slug}`}>
            Back to course shell
          </Link>
          <p className="eyebrow">{isPracticalAssessment ? "Summative assessment" : unit.order === 0 ? "Orientation" : `Learning Unit ${unit.order}`}</p>
          <h1>{unit.title}</h1>
          <p>{unit.subtitle}</p>
          <div className="unit-meta">
            <span>{unit.duration}</span>
            <span>{isCompleted ? "Completed" : "Opened"}</span>
            {!isPracticalAssessment ? (
              <a href={originalHref}>{isScannexUnit ? "Open Scannex e-book" : "Open original unit"}</a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="content-band">
        <div className="content-inner">
          <div className="media-stack">
            {isPracticalAssessment && unit.practicalAssessment ? (
              <section className="unit-resources" aria-labelledby="summative-assessment-heading">
                <p className="eyebrow">Final assessment</p>
                <h2 id="summative-assessment-heading">Scannex summative assessment</h2>
                <p>Complete the secure 68-mark knowledge assessment, then attend the supervised Scannex practical assessment worth 32 marks.</p>
                <p className="resource-status">
                  The final result requires 75% overall and an assessor-approved practical outcome. This is a controlled training assessment, not production Viewer access.
                </p>
                <div className="button-row">
                  <Link className="primary-button" href={`/learn/${course.slug}/units/${unit.slug}/knowledge`}>
                    Start knowledge assessment
                  </Link>
                  <Link className="primary-button" href={unit.practicalAssessment.labPath}>
                    Open practical assessment
                  </Link>
                </div>
              </section>
            ) : isScannexUnit ? (
              <>
                <UnitResources
                  eBookHref={originalHref}
                  activityHref={scormLaunchSrc ? `/learn/${course.slug}/units/${unit.slug}/scorm` : undefined}
                  activityAvailable={Boolean(scormLaunchSrc)}
                />
                {viewerAvailability?.appliesToUnit ? (
                  <section className="unit-resources" aria-labelledby="viewer-practice-heading">
                    <p className="eyebrow">Genuine Viewer practice</p>
                    <h2 id="viewer-practice-heading">Scannex Viewer Lab</h2>
                    <p>Open a separate, secure Windows session to practise the controls taught in this learning unit.</p>
                    <p className={viewerAvailability.canLaunch ? "resource-status" : "form-error"}>{viewerAvailability.message}</p>
                    <div className="button-row">
                      {viewerAvailability.canLaunch ? <Link className="primary-button" href={`/learn/${course.slug}/units/${unit.slug}/viewer-lab`}>Prepare Viewer practice session</Link> : <button className="primary-button" type="button" disabled>Viewer unavailable</button>}
                    </div>
                  </section>
                ) : null}
              </>
            ) : null}
            {!isPracticalAssessment && scormLaunchSrc ? (
              <ScormPlayer
                courseSlug={course.slug}
                unitSlug={unit.slug}
                launchSrc={scormLaunchSrc}
                title={unit.title}
              />
            ) : !isPracticalAssessment ? (
              <>
                <figure className="media-item">
                  <iframe
                    title={`${unit.title} ${isScannexUnit ? "e-book" : "published unit"}`}
                    src={embeddedSrc}
                    loading="lazy"
                    allow="fullscreen"
                    allowFullScreen
                  />
                  <figcaption>
                    {isScannexUnit
                      ? "Embedded Scannex e-book. Use the link above if the embedded view is blocked."
                      : "Embedded published unit. Use the fallback link below if the embedded view is blocked."}
                  </figcaption>
                </figure>
                <div className="button-row">
                  <a className="primary-button" href={originalHref} target="_blank" rel="noreferrer">
                    {isScannexUnit ? "Open e-book in a full window" : "Open expanded unit"}
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
              </>
            ) : null}
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
              <a className="primary-button" href={`/learn/${course.slug}/units/${next.slug}`}>
                Next: {next.title}
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
