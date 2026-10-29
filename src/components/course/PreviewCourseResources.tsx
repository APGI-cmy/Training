"use client";

import type { SyntheticEvent } from "react";
import type { Course } from "@/types/course";
import { encodeAssetPath } from "@/lib/asset-path";
import { previewUnitHref, type CoursePreview } from "@/lib/course-preview";

export function PreviewCourseResources({course, preview}: {course: Course; preview: CoursePreview}) {
  const unit = course.units[0];
  if (!course.welcomePath || !unit) return null;
  const unitHref = previewUnitHref(preview, unit.slug);
  const launchHref = unit.scormPath ? `${unitHref}/activity` : unitHref;

  function connectWelcome(event: SyntheticEvent<HTMLIFrameElement>) {
    // Keep the portable package intact while directing Begin through this
    // authenticated administrator/reviewer context and its SCORM parent.
    const begin = event.currentTarget.contentDocument?.getElementById("begin-lu1");
    if (begin?.tagName === "A") {
      begin.setAttribute("href", launchHref);
      begin.setAttribute("target", "_top");
    }
  }

  return <section className="content-band" aria-label="Course welcome and reading">
    <div className="content-inner">
      <h2>Welcome and reading</h2>
      <p>Watch the separate course welcome, then open LU1 to test the learning activities. Preview progress stays in this tab.</p>
      <div className="button-row">
        <a className="primary-button" href={launchHref}>Open LU1 learning activities</a>
        <a className="secondary-button" href={encodeAssetPath(unit.publishedPath)} target="_blank" rel="noreferrer">Open LU1 reading book</a>
      </div>
      <details>
        <summary>Watch course welcome</summary>
        <iframe title={`${course.title} — course welcome`} src={`${encodeAssetPath(course.welcomePath)}?review=1`} onLoad={connectWelcome} loading="lazy" allow="fullscreen" allowFullScreen style={{width: "100%", height: "70vh", border: 0}} />
      </details>
    </div>
  </section>;
}
