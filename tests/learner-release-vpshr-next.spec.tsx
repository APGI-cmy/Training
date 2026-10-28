import React from "react";
import {createHash} from "node:crypto";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach,describe,expect,it,vi} from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),access:vi.fn(),record:vi.fn(),cookie:vi.fn(),redirect:vi.fn(),revalidate:vi.fn()}));
vi.mock("next/link",()=>({default:({href,children,...props}:{href:string;children:React.ReactNode})=><a href={href} {...props}>{children}</a>}));
vi.mock("next/cache",()=>({revalidatePath:m.revalidate}));
vi.mock("next/navigation",()=>({redirect:(href:string)=>{m.redirect(href);throw Error(`redirect:${href}`);}}));
vi.mock("@/server/auth/session",()=>({requireSession:m.session}));
vi.mock("@/lib/services/enrolments/get-course-access",()=>({getCourseAccess:m.access}));
vi.mock("@/server/progress/record-progress",()=>({recordProgressForSession:m.record}));
vi.mock("@/server/progress/progress-cookie",()=>({markCookieUnitCompleted:m.cookie}));
vi.mock("@/server/actions/progress/record-progress-event",()=>({recordProgressEvent:vi.fn()}));
import {completeVpshrAndContinue} from "@/server/actions/progress/complete-vpshr-and-continue";
import {UnitViewer} from "@/components/course/UnitViewer";
import {getCourseBySlug} from "@/lib/courses";
import {getCourseShell} from "@/lib/services/courses/get-course-shell";
import {getUnitContent} from "@/lib/services/courses/get-unit-content";

const slug="vpshr-level-0",course=getCourseBySlug(slug)!;
const session={accessToken:"qa",user:{id:"actual-learner",email:"learner@example.invalid"}};
beforeEach(()=>{vi.clearAllMocks();m.session.mockResolvedValue(session);m.access.mockResolvedValue({canAccess:true});m.record.mockResolvedValue(undefined);m.cookie.mockResolvedValue(undefined);});
describe("VPSHR completion using Next",()=>{
 it("removes all duplicate platform questions and otherwise preserves the existing course definition",()=>{
  expect(course.units).toHaveLength(13);expect(course.units.every(unit=>unit.quiz.length===0)).toBe(true);
  const copy=JSON.parse(JSON.stringify(course));copy.units.forEach((unit:{quiz?:unknown})=>delete unit.quiz);
  // The separately approved 28 October introduction changes only its media and duration.
  expect(copy.units[0].duration).toBe('3 min');
  expect(copy.units[0].media[0].src).toBe('/courses/vpshr-level-0/introduction/welcome.mp4');
  expect(copy.units[0].media[0].poster).toBe('/courses/vpshr-level-0/introduction/poster.jpg');
  expect(copy.units[0].media[1].title).toBe('Course welcome and orientation');
  copy.units[0].duration='5 min';
  copy.units[0].media[0].src='/courses/vpshr-level-0/introduction/data/video1.mp4';
  copy.units[0].media[0].poster='/courses/vpshr-level-0/introduction/data/thmb1.jpg';
  copy.units[0].media[1].title='Original published orientation';
  // Keep the original identity check, normalizing only approved SCORM resource moves.
  // Both packages and their launch paths have dedicated SCORM integration checks.
  const baseline=JSON.stringify(copy)
   .replaceAll("/courses/vpshr-level-0/LU11 Civil-unrest/res","/courses/vpshr-level-0/LU11 Civil-unrest")
   .replaceAll("/courses/vpshr-level-0/LU5 Factors-contributing/res","/courses/vpshr-level-0/LU5 Factors-contributing/5. Basic human rights-final (Published)/6. Factors that may contribute-final (Published)");
  expect(createHash("sha256").update(baseline).digest("hex")).toBe("512fbc464d2bb9410f514c4146168c4730713a8d36891c54726b9c2470acd573");
 });
 it("keeps Previous/Next and the published iframe while removing the manual completion control and extra quiz in both modes",()=>{
  const content=getUnitContent(slug,"lu2")!,shell=getCourseShell(slug)!;
  for(const preview of [undefined,{scope:"qa-preview",courseHref:"/admin/preview",unitBaseHref:"/admin/preview",returnHref:"/catalogue",returnLabel:"Catalogue"}]){
   const html=renderToStaticMarkup(<UnitViewer content={content} units={shell.units} preview={preview}/>);
   expect(html).toContain("Previous: Definition of Human Rights");expect(html).toContain("Next: Benefits of Human Rights");expect(html).toContain("unit-advance");expect(html).toContain("<iframe");
   expect(html).not.toContain("Mark unit complete");expect(html).not.toContain("Knowledge check");expect(html).not.toContain("Submit quiz");
  }
 });
 it("saves the authenticated learner's current unit before its cookie and navigation, ignoring a submitted redirect",async()=>{
  const form=new FormData();form.set("next","https://untrusted.example");
  await expect(completeVpshrAndContinue({courseSlug:slug,unitSlug:"lu2"},{},form)).rejects.toThrow(`redirect:/learn/${slug}/units/lu3`);
  expect(m.record).toHaveBeenCalledWith({session,courseSlug:slug,unitSlug:"lu2",eventType:"unit_completed",requirePersistence:true});
  expect(m.cookie).toHaveBeenCalledWith({userId:"actual-learner",courseId:slug,unitId:"lu2"});
  expect(m.record.mock.invocationCallOrder[0]).toBeLessThan(m.cookie.mock.invocationCallOrder[0]);expect(m.cookie.mock.invocationCallOrder[0]).toBeLessThan(m.redirect.mock.invocationCallOrder[0]);
 });
 it("completes the final unit before returning to the course",async()=>{
  await expect(completeVpshrAndContinue({courseSlug:slug,unitSlug:"lu12"},{},new FormData())).rejects.toThrow(`redirect:/learn/${slug}?progress=unit-completed`);
  expect(m.record).toHaveBeenCalledWith(expect.objectContaining({unitSlug:"lu12"}));
 });
 it("does not record completion or advance without learner access",async()=>{
  m.access.mockResolvedValue({canAccess:false});expect((await completeVpshrAndContinue({courseSlug:slug,unitSlug:"lu2"},{},new FormData())).error).toContain("course access");
  expect(m.record).not.toHaveBeenCalled();expect(m.cookie).not.toHaveBeenCalled();expect(m.redirect).not.toHaveBeenCalled();
 });
 it("stays on the unit and offers retry when persistence fails",async()=>{
  m.record.mockRejectedValue(Error("database unavailable"));expect((await completeVpshrAndContinue({courseSlug:slug,unitSlug:"lu2"},{},new FormData())).error).toContain("could not be saved");
  expect(m.cookie).not.toHaveBeenCalled();expect(m.redirect).not.toHaveBeenCalled();
 });
 it.each(["scannex-training-programme","tiger-kidnapping-telecommunications","unknown"])("cannot use this action to bypass %s completion rules",async courseSlug=>{
  expect((await completeVpshrAndContinue({courseSlug,unitSlug:"lu1"},{},new FormData())).error).toBeTruthy();expect(m.record).not.toHaveBeenCalled();
 });
});
