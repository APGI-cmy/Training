import type { ReactNode } from "react";
import Link from "next/link";
import { ScormPlayer } from "./ScormPlayer";
import { encodeAssetPath } from "@/lib/courses";
import type { UnitContent } from "@/lib/services/courses/get-unit-content";
import { previewUnitHref, type CoursePreview } from "@/lib/course-preview";

export function LearningActivity({content,preview,feedback}:{content:UnitContent;preview?:CoursePreview;feedback?:ReactNode}) {
  const {course,unit,previous,next}=content;
  const unitHref=(slug:string)=>preview?previewUnitHref(preview,slug):`/learn/${course.slug}/units/${slug}`;
  return <main className="learner-scorm-full"><ScormPlayer key={`${preview?.scope??"learner"}:${unit.slug}`} courseSlug={course.slug} unitSlug={unit.slug} unitId={unit.id} previewScope={preview?.scope} launchSrc={encodeAssetPath(unit.scormPath!)} title={unit.title} mode={preview?"preview":"learner"} immersive returnHref={unitHref(unit.slug)} resourceHref={course.slug==="scannex-training-programme"?encodeAssetPath(unit.publishedPath):undefined} navigation={<div className="button-row">{previous?<a className="secondary-button" href={unitHref(previous.slug)}>Previous: {previous.title}</a>:null}{next?<a className="primary-button" href={unitHref(next.slug)}>Next: {next.title}</a>:<Link className="primary-button" href={preview?.courseHref??`/learn/${course.slug}`}>Finish — return to course</Link>}</div>}/>{feedback}</main>;
}
