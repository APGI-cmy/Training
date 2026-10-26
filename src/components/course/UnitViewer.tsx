import Link from "next/link";
import type { ReactNode } from "react";
import { QuizEngine } from "@/components/QuizEngine";
import { PreviewUnitProgress } from "./PreviewProgress";
import { previewUnitHref, type CoursePreview } from "@/lib/course-preview";
import { encodeAssetPath } from "@/lib/courses";
import { ScormPlayer } from "@/components/course/ScormPlayer";
import { PresentationViewport } from "@/components/course/PresentationViewport";
import { UnitResources } from "@/components/course/UnitResources";
import type { CourseShellUnit } from "@/lib/services/courses/get-course-shell";
import type { UnitContent } from "@/lib/services/courses/get-unit-content";
import { recordProgressEvent } from "@/server/actions/progress/record-progress-event";
import { ViewerLabNotice } from "@/components/course/ViewerLabNotice";
import type { ViewerLabAvailability } from "@/lib/services/viewer-lab/viewer-lab-settings";

export function UnitViewer({
  content,
  units,
  viewerAvailability,
  preview,
  feedback,
  referenceEbook
}: {
  content: UnitContent;
  units: CourseShellUnit[];
  viewerAvailability?: ViewerLabAvailability;
  preview?: CoursePreview;
  feedback?: ReactNode;
  referenceEbook?: string | null;
}) {
  const { course, unit, previous, next, embeddedContentHref, originalContentHref } = content;
  const activeUnit = units.find((candidate) => candidate.id === unit.id);
  const embeddedSrc = embeddedContentHref ? encodeAssetPath(embeddedContentHref) : undefined;
  const originalHref = encodeAssetPath(originalContentHref);
  const scormLaunchSrc = unit.scormPath ? encodeAssetPath(unit.scormPath) : undefined;
  const isScannexUnit = course.slug === "scannex-training-programme";
  const isPracticalAssessment = Boolean(unit.practicalAssessment);
  const isCompleted = activeUnit?.isCompleted ?? false;
  const courseHref = preview?.courseHref ?? `/learn/${course.slug}`;
  const unitHref = (slug: string) => preview ? previewUnitHref(preview, slug) : `/learn/${course.slug}/units/${slug}`;
  const navigation = <nav className="unit-navigation" aria-label="Learning unit navigation">
    {previous ? <a className="secondary-button" href={unitHref(previous.slug)}>Previous: {previous.title}</a> : <Link className="secondary-button" href={courseHref}>Course home</Link>}
    {next ? <a className="primary-button" href={unitHref(next.slug)}>Next: {next.title}</a> : <Link className="primary-button" href={courseHref}>Finish — return to course</Link>}
  </nav>;

  const completeUnit = recordProgressEvent.bind(null, {
    courseSlug: course.slug,
    unitSlug: unit.slug,
    eventType: "unit_completed"
  });

  return (
    <main>
      {!preview && viewerAvailability?.appliesToUnit ? <ViewerLabNotice courseSlug={course.slug} unitSlug={unit.slug} availability={viewerAvailability} /> : null}
      <section className="unit-masthead">
        <div className="content-inner">
          <Link className="back-link" href={courseHref}>
            Back to course shell
          </Link>
          <p className="eyebrow">{isPracticalAssessment ? "Summative assessment" : unit.order === 0 ? "Orientation" : `Learning Unit ${unit.order}`}</p>
          <h1>{unit.title}</h1>
          <p>{unit.subtitle}</p>
          <div className="unit-meta">
            <span>{unit.duration}</span>
            {preview ? <PreviewUnitProgress scope={preview.scope} unitId={unit.id}/> : <span>{isCompleted ? "Completed" : "Opened"}</span>}
            {!isPracticalAssessment ? (
              <a href={originalHref}>{isScannexUnit ? "Open Scannex e-book" : "Open original unit"}</a>
            ) : null}
          </div>
          {navigation}
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
                  <Link className="primary-button" href={`${unitHref(unit.slug)}/knowledge`}>
                    Start knowledge assessment
                  </Link>
                  {preview ? <button className="primary-button" type="button" disabled>Supervised practical — assessor required</button> : <Link className="primary-button" href={unit.practicalAssessment.labPath}>Open practical assessment</Link>}
                </div>
                {preview ? <p>The native practical remains supervised and assessor-controlled. Preview does not launch an assessment or award practical marks.</p> : null}
                {feedback}
              </section>
            ) : isScannexUnit ? (
              <>
                <UnitResources
                  eBookHref={originalHref}
                  activityHref={scormLaunchSrc ? `${unitHref(unit.slug)}/${preview ? "activity" : "scorm"}` : undefined}
                  activityAvailable={Boolean(scormLaunchSrc)}
                />
                {viewerAvailability?.appliesToUnit ? (
                  <section className="unit-resources" aria-labelledby="viewer-practice-heading">
                    <p className="eyebrow">Genuine Viewer practice</p>
                    <h2 id="viewer-practice-heading">Scannex Viewer Lab</h2>
                    <p>Open a separate, secure Windows session to practise the controls taught in this learning unit.</p>
                    <p className={viewerAvailability.canLaunch ? "resource-status" : "form-error"}>{viewerAvailability.message}</p>
                    <div className="button-row">
                      {!preview && viewerAvailability.canLaunch ? <Link className="primary-button" href={`/learn/${course.slug}/units/${unit.slug}/viewer-lab`}>Prepare Viewer practice session</Link> : <button className="primary-button" type="button" disabled>{preview ? "Viewer practice requires a separate authorised session" : "Viewer unavailable"}</button>}
                    </div>
                  </section>
                ) : null}
              </>
            ) : null}
            {!isPracticalAssessment && scormLaunchSrc ? (
              <PresentationViewport title={unit.title} navigation={navigation}><ScormPlayer
                key={`${preview?.scope ?? "learner"}:${unit.slug}`}
                courseSlug={course.slug}
                unitSlug={unit.slug}
                launchSrc={scormLaunchSrc}
                title={unit.title}
                mode={preview ? "preview" : "learner"}
                previewScope={preview?.scope}
                unitId={unit.id}
              />{feedback}</PresentationViewport>
            ) : !isPracticalAssessment ? (
              <>
                <PresentationViewport title={unit.title} navigation={navigation}><figure className="media-item">
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
                </figure>{feedback}</PresentationViewport>
                <div className="button-row">
                  <a className="primary-button" href={originalHref} target="_blank" rel="noreferrer">
                    {isScannexUnit ? "Open e-book in a full window" : "Open expanded unit"}
                  </a>
                  {!preview ? <Link className="secondary-button" href={`/courses/${course.slug}/${unit.slug}`}>
                    Open legacy responsive unit
                  </Link> : null}
                </div>
                {preview ? <PreviewUnitProgress scope={preview.scope} unitId={unit.id} complete/> : <form action={completeUnit}>
                  <button className="primary-button" type="submit" disabled={isCompleted}>
                    {isCompleted ? "Unit completed" : "Mark unit complete"}
                  </button>
                </form>}
              </>
            ) : null}
          </div>
          {referenceEbook && !isScannexUnit ? <p><a className="secondary-button" href={encodeAssetPath(referenceEbook)} target="_blank" rel="noreferrer">Open reference e-book (PDF)</a></p> : null}
        </div>
      </section>

      {unit.quiz.length ? <QuizEngine key={`${preview?.scope ?? "learner"}:${unit.id}`} unitId={unit.id} questions={unit.quiz} preview={!!preview}/> : null}

      <section className="content-band muted-band">
        <div className="content-inner">
          <p className="eyebrow">Navigation</p>
          {navigation}
        </div>
      </section>
    </main>
  );
}
