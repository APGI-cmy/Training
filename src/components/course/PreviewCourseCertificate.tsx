"use client";
import Link from "next/link";
import type { CoursePreview } from "@/lib/course-preview";
import type { CourseShell } from "@/lib/services/courses/get-course-shell";
import { usePreviewProgress } from "./PreviewProgress";

// Exercise the end-of-course screen without invoking certificate issuance or eligibility RPCs.
export function PreviewCourseCertificate({ shell, preview }: { shell: CourseShell; preview: CoursePreview }) {
  const progress = usePreviewProgress(preview.scope);
  const complete = shell.units.length > 0 && shell.units.every(unit => progress.completed.includes(unit.id));
  return <main className="content-band"><div className="content-inner"><p className="eyebrow">End of course</p><h1>Your certificate</h1><h2>{shell.course.title}</h2><section className="notice-card">
    <h2>{complete ? "Course preview completed" : "Complete the course requirements first"}</h2>
    <p>{complete ? "You have tested completion of the learning units. In the learner journey, an eligible learner can issue their certificate here." : "Complete every required learning unit. For Scannex, the approved assessor must also record your summative pass and supporting practical evidence. Practice streaming and viewing a unit do not qualify you for a certificate."}</p>
    <p>Preview cannot award a qualification or issue a numbered certificate. Learner eligibility and assessor approval remain required.</p>
    <Link className="primary-button" href={preview.courseHref}>Return to your course</Link>
  </section></div></main>;
}
