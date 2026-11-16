import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({admin:vi.fn(),review:vi.fn(),progress:vi.fn(),session:vi.fn(),roles:vi.fn(),catalogueReviews:vi.fn()}));
vi.mock("next/link",()=>({default:({href,children,...props}:{href:string;children:React.ReactNode})=><a href={href} {...props}>{children}</a>}));
vi.mock("next/navigation",()=>({notFound:()=>{throw Error("not found");}}));
vi.mock("@/lib/auth/require-admin",()=>({requireAdmin:mocks.admin}));
vi.mock("@/server/services/course-reviews",()=>({requireReview:mocks.review}));
vi.mock("@/server/auth/session",()=>({getCurrentSession:mocks.session,getUserRoles:mocks.roles}));
vi.mock("@/server/services/organisations/get-catalogue-reviews",()=>({getCatalogueReviews:mocks.catalogueReviews}));
vi.mock("@/server/actions/progress/record-progress-event",()=>({recordProgressEvent:mocks.progress}));
import { UnitViewer } from "@/components/course/UnitViewer";
import { PreviewCourseHome } from "@/components/course/PreviewProgress";
import { LearningActivity } from "@/components/course/LearningActivity";
import { getUnitContent } from "@/lib/services/courses/get-unit-content";
import { getCourseShell } from "@/lib/services/courses/get-course-shell";
import { coursePreviewEntry,requireAdminCoursePreview,requireReviewCoursePreview } from "@/server/services/course-preview";
import { parsePreviewProgress,previewStorageKey,type CoursePreview } from "@/lib/course-preview";
import { previewAdminTheory } from "@/server/actions/assessments/preview-admin-theory";
import { getScannexTheoryQuestions } from "@/server/assessments/scannex-theory-bank";
import { previewReviewTheory } from "@/server/actions/course-reviews";
import { ReviewPanel } from "@/components/reviews/ReviewPanel";

const course="tiger-kidnapping-telecommunications";
const preview:CoursePreview={scope:"test-account:review-id:version",courseHref:"/course-reviews/review-id/preview",unitBaseHref:"/course-reviews/review-id/units",returnHref:"/course-reviews/review-id",returnLabel:"Back to review summary"};
const assignment={email:"reviewer@example.invalid",state:"invited"};
beforeEach(()=>{vi.clearAllMocks();mocks.session.mockResolvedValue({accessToken:"qa",user:{id:"reviewer-id"}});mocks.roles.mockResolvedValue([]);mocks.catalogueReviews.mockResolvedValue(new Map());mocks.admin.mockResolvedValue({session:{user:{id:"admin-id"}}});mocks.review.mockResolvedValue({session:{user:{id:"reviewer-id"}},source:{fingerprint:"version"},email:assignment.email,principal:false,fresh:true,round:{id:"review-id",course_id:course,fingerprint:"version",document:{participants:[assignment]}}});});

describe("Learner experience preview",()=>{
 it("sends administrators to the role-gated preview and reviewers to only their assigned review",async()=>{
  mocks.roles.mockResolvedValue(["admin"]);expect(await coursePreviewEntry(course)).toMatchObject({href:`/admin/courses/${course}/preview`});expect(mocks.catalogueReviews).not.toHaveBeenCalled();
  mocks.roles.mockResolvedValue([]);mocks.catalogueReviews.mockResolvedValue(new Map([[course,{id:"assigned-review"}]]));expect(await coursePreviewEntry(course)).toMatchObject({href:"/course-reviews/assigned-review/preview"});
  mocks.catalogueReviews.mockResolvedValue(new Map());expect(await coursePreviewEntry(course)).toBeUndefined();mocks.session.mockResolvedValue(null);expect(await coursePreviewEntry(course)).toBeUndefined();
 });
 it("uses the learner course home and keeps every start, unit and certificate link in preview",()=>{
  const html=renderToStaticMarkup(<PreviewCourseHome shell={getCourseShell(course)!} preview={preview}/>);
  expect(html).toContain("Start learning");expect(html).toContain("Choose where to continue");expect(html).toContain("My course certificate");
  expect(html).toContain('href="/course-reviews/review-id/units/lu1"');expect(html).toContain('href="/course-reviews/review-id/preview/certificate"');expect(html).not.toContain('href="/learn/');
 });
 it("provides next activity inside the same presentation viewport as the learner and retains feedback",()=>{
  const content=getUnitContent(course,"lu5")!,shell=getCourseShell(course)!;
  const learner=renderToStaticMarkup(<UnitViewer content={content} units={shell.units}/>);
  const review=renderToStaticMarkup(<UnitViewer content={content} units={shell.units} preview={preview} feedback={<aside>Review feedback for LU5</aside>}/>);
  for(const html of [learner,review]){expect(html).toContain("Enlarge presentation");expect(html).toContain("Full screen");expect(html).toContain("Next: ");expect(html).toContain("Previous: ");expect(html).toContain(content.unit.title);expect(html.indexOf("presentation-unit-navigation")).toBeLessThan(html.indexOf("presentation-display-content"));}
  expect(learner).toContain(`href="/learn/${course}/units/lu6"`);expect(review).toContain('href="/course-reviews/review-id/units/lu6"');expect(review).not.toContain('href="/learn/');expect(review).toContain("Review feedback for LU5");expect(mocks.progress).not.toHaveBeenCalled();
 });
 it("keeps next/previous navigation in the full-window learning activity",()=>{
  const html=renderToStaticMarkup(<LearningActivity content={getUnitContent(course,"lu5")!} preview={preview}/>);
  expect(html).toContain("Back to unit");expect(html).toContain('href="/course-reviews/review-id/units/lu6"');expect(html).toContain('href="/course-reviews/review-id/units/lu4"');expect(html).not.toContain('href="/learn/');
 });
 it("does not grant a reviewer a native Scannex practical attempt",()=>{
  const scannex="scannex-training-programme",content=getUnitContent(scannex,"lu9")!;
  const html=renderToStaticMarkup(<UnitViewer content={content} units={getCourseShell(scannex)!.units} preview={preview}/>);
  expect(html).toContain("Start knowledge assessment");expect(html).toContain("Supervised practical — assessor required");expect(html).not.toContain(`href="${content.unit.practicalAssessment!.labPath}"`);
 });
 it("keeps admin preview behind the existing role check and scopes test records by account and course",async()=>{
  const result=await requireAdminCoursePreview(course);expect(mocks.admin).toHaveBeenCalledOnce();expect(result.preview.scope).toContain(`admin:admin-id:${course}:`);expect(result.preview.unitBaseHref).toBe(`/admin/courses/${course}/preview`);
  mocks.admin.mockRejectedValue(Error("unauthorised"));await expect(requireAdminCoursePreview(course)).rejects.toThrow("unauthorised");
 });
 it("requires the actual review assignment and scopes each version separately",async()=>{
  const result=await requireReviewCoursePreview("review-id");expect(mocks.review).toHaveBeenCalledWith("review-id");expect(result.preview.scope).toBe("review:reviewer-id:review-id:version");
  mocks.review.mockResolvedValue({...await mocks.review(),source:{fingerprint:"new-version"}});
  expect((await requireReviewCoursePreview("review-id")).preview.scope).not.toBe(result.preview.scope);
 });
 it("lets assigned reviewers preview a changed deployment while keeping saved review evidence read-only",async()=>{
  const context=await mocks.review();mocks.review.mockResolvedValue({...context,fresh:false,source:{fingerprint:"new-version"}});
  const result=await requireReviewCoursePreview("review-id");expect(result.round.fingerprint).toBe("version");expect(result.preview.scope).toContain("new-version");expect(result.preview.notice).toContain("Changes implemented");
  const html=renderToStaticMarkup(<ReviewPanel id="review-id" unit="lu1" canEdit={false} disabledReason={result.preview.notice} email={assignment.email} hasEbook={false}/>);
  expect(html).toContain("earlier registered review version");expect(html).not.toContain("Save review feedback");expect(html).not.toContain("closed or overdue");
 });
 it("rejects a declined reviewer even when a legacy review reader returns that assignment",async()=>{
  const context=await mocks.review();mocks.review.mockResolvedValue({...context,round:{...context.round,document:{participants:[{...assignment,state:"declined"}]}}});
  await expect(requireReviewCoursePreview("review-id")).rejects.toThrow("not found");
 });
 it("recovers corrupt preview storage as empty progress and uses no learner keys",()=>{
  expect(parsePreviewProgress("broken")).toEqual({opened:[],completed:[],attempts:{}});expect(parsePreviewProgress('{"opened":[],"completed":[]}').attempts).toEqual({});
  expect(previewStorageKey(preview.scope)).toContain("apgi-course-preview-v1:");expect(previewStorageKey("admin:a:course")).not.toBe(previewStorageKey("admin:b:course"));
 });
 it("checks admin theory answers using the real scorer without recording an attempt",async()=>{
  const form=new FormData();form.set("courseSlug","scannex-training-programme");form.set("answers",JSON.stringify(Object.fromEntries(getScannexTheoryQuestions().map(q=>[q.id,[q.options[0].id]]))));
  const fetchSpy=vi.spyOn(globalThis,"fetch");const result=await previewAdminTheory({},form);
  expect(result.error).toBeUndefined();expect(result.maxScore).toBe(68);expect(result.message).toContain("No learner attempt");expect(fetchSpy).not.toHaveBeenCalled();fetchSpy.mockRestore();expect(mocks.admin).toHaveBeenCalledOnce();
 });
 it("checks current preview theory without accepting an obsolete review or notifying its team",async()=>{
  const context=await mocks.review();mocks.review.mockResolvedValue({...context,fresh:false,round:{...context.round,course_id:"scannex-training-programme"}});
  const form=new FormData();form.set("round_id","11111111-1111-4111-8111-111111111111");form.set("answers",JSON.stringify(Object.fromEntries(getScannexTheoryQuestions().map(q=>[q.id,[q.options[0].id]]))));
  const network=vi.spyOn(globalThis,"fetch");const result=await previewReviewTheory({},form);expect(result.error).toBeUndefined();expect(result.maxScore).toBe(68);expect(result.message).toContain("No learner attempt");expect(network).not.toHaveBeenCalled();network.mockRestore();
 });
});
