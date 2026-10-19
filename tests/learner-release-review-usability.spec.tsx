import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,it,expect,vi} from "vitest";
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn(),push:vi.fn()})}));
vi.mock("next/link",()=>({default:({href,children}:{href:string;children:React.ReactNode})=><a href={href}>{children}</a>}));
vi.mock("@/server/actions/course-reviews",()=>({courseReviewAction:vi.fn(),createCourseReview:vi.fn()}));
vi.mock("@/server/actions/publication-workflow",()=>({publicationWorkflowAction:vi.fn()}));
import {CoverageConfirmation,RequestReviewForm,submitReviewFeedback} from "@/components/reviews/ReviewForms";
import {ReviewPanel,editableFindingComment} from "@/components/reviews/ReviewPanel";
import {ReviewSummary} from "@/components/reviews/ReviewSummary";
import {activeFindings,findingCategories,recordFinding,reviewPeople,type ReviewDocument,type ReviewFinding} from "@/lib/course-review";
import {reviewEbook} from "@/server/services/review-resources";
import {getCourses} from "@/lib/courses";
const finding=(id="old"):ReviewFinding=>({id,unit:"lu1",reference:"Slide 2",category:"Content",blocking:false,author:"a@example.com",userId:"a",at:"now",text:"A useful correction",status:"open",replies:[]});
const doc=()=>({findings:[finding()]} as ReviewDocument);
describe("Review persistence, outcomes and safe replacement",()=>{
 it("renders a saved coverage checkbox checked after a new page render",()=>{const html=renderToStaticMarkup(<CoverageConfirmation id="r" unit="lu1" confirmed/>);expect(html).toContain('checked=""');expect(html).toContain("Confirmed and saved");expect(html).toContain("Coverage saved");});
 it("keeps unsaved coverage unchecked",()=>{const html=renderToStaticMarkup(<CoverageConfirmation id="r" unit="lu1" confirmed={false}/>);expect(html).not.toContain('checked=""');expect(html).toContain("Confirm coverage");});
 it("does not silently replace an existing reference",()=>{const d=doc();expect(()=>recordFinding(d,finding("new"))).toThrow(/keep all findings/);expect(d.findings).toHaveLength(1);});
 it("keeps earlier evidence and only replaces the author's exact reference",()=>{const d=doc();d.findings[0].attachment="private.png";recordFinding(d,{...finding("new"),outcome:"satisfied",text:"Nothing to add",status:"closed"},"old");expect(d.findings).toHaveLength(1);expect(d.findings[0].previousVersions?.[0]).toMatchObject({text:"A useful correction",attachment:"private.png"});expect(activeFindings(d).map(f=>f.id)).toEqual(["old"]);});
 it("adds a different slide or another reviewer's feedback without replacing others",()=>{const d=doc();recordFinding(d,{...finding("other"),author:"b@example.com"});recordFinding(d,{...finding("slide3"),reference:"Slide 3"});expect(activeFindings(d)).toHaveLength(3);});
 it("rejects a stale replacement target",()=>{expect(()=>recordFinding(doc(),finding("new"),"stale")).toThrow(/Reload/);});
 it("cannot hide an unresolved blocking finding by declaring satisfaction",()=>{const d=doc();d.findings[0].blocking=true;expect(()=>recordFinding(d,{...finding("new"),outcome:"satisfied",status:"closed"},"old")).toThrow(/independently verified/);expect(activeFindings(d)[0].blocking).toBe(true);});
 it("accepts multiple issue categories and rejects empty or excessive categories",()=>{expect(findingCategories(["Content","E-book issue","Content"," Navigation "])).toEqual(["Content","E-book issue","Navigation"]);expect(()=>findingCategories([])).toThrow();expect(()=>findingCategories(Array.from({length:11},(_,i)=>String(i)))).toThrow();});
 it("records independent content/commercial scope without changing full reviewer roles",()=>{const people=reviewPeople(["a@example.com","b@example.com"],["primary","primary"],"a@example.com",["content","content_and_commercials"]);expect(people.map(p=>p.scope)).toEqual(["content","content_and_commercials"]);expect(people.every(p=>p.role==="primary")).toBe(true);});
 it("offers the assignment checkbox without implying administrative authority",()=>{const html=renderToStaticMarkup(<RequestReviewForm courseId="course" email="a@example.com" companies={[]}/>);expect(html).toContain("Also review commercials");expect(html).toContain("does not grant APGI administrator rights");});
 it("summarises no-issue reviews separately from findings",()=>{const d=doc();d.findings.push({...finding("ok"),reference:"Quiz",outcome:"satisfied",status:"closed"});const html=renderToStaticMarkup(<ReviewSummary document={d}/>);expect(html).toContain("1 findings");expect(html).toContain("1 “nothing to add” reviews");});
 it("does not claim every presentation is an ebook",()=>{for(const course of getCourses())for(const unit of course.units){const book=reviewEbook(unit);if(course.slug==="vpshr-level-0")expect(book).toBeNull();else expect(book).toMatch(/book.pdf$/);}});
 it("keeps independent LU/quiz declarations, comments, snapshot and upload controls together",()=>{const html=renderToStaticMarkup(<ReviewPanel id="r" unit="lu1" email="a@example.com" hasEbook canEdit/>);expect(html).toContain('name="satisfied_part" value="lu"');expect(html).toContain('name="satisfied_part" value="quiz"');expect(html).toContain("Comments / requested changes");expect(html).toContain('name="comment"');expect(html).toContain("Take a snapshot");expect(html).toContain('type="file"');expect(html).toContain("Add another category");});
 it("includes the explicit replacement confirmation in the feedback panel",()=>{const html=renderToStaticMarkup(<ReviewPanel id="r" unit="lu1" email="a@example.com" hasEbook canEdit/>);expect(html).toContain("Keep all review findings");expect(html).toContain("earlier version");});
});

describe("Multiple findings and saved editor values",()=>{
 it("keeps distinct issues under the same reference when explicitly requested",()=>{const d=doc();recordFinding(d,{...finding("second"),category:"Quiz or scoring",text:"A separate quiz issue"},"",true);expect(activeFindings(d)).toHaveLength(2);expect(d.findings.map(f=>f.text)).toEqual(["A useful correction","A separate quiz issue"]);});
 it("edits the selected finding without altering a sibling at the same reference",()=>{const d=doc();recordFinding(d,finding("second"),"",true);recordFinding(d,{...finding("edited"),text:"Revised second issue"},"second");expect(d.findings[0].text).toBe("A useful correction");expect(d.findings[1].text).toBe("Revised second issue");expect(d.findings[1].previousVersions).toHaveLength(1);});
 it("cannot edit a different author's finding",()=>expect(()=>recordFinding(doc(),{...finding("new"),author:"other@example.com"},"old")).toThrow(/Reload/));
 it("prefills the raw saved comment and retains legacy feedback",()=>{expect(editableFindingComment({...finding(),comment:"Raw saved comment"})).toBe("Raw saved comment");expect(editableFindingComment(finding())).toBe("A useful correction");});
 it("can amend an unresolved blocker without clearing it",()=>{const d=doc();d.findings[0].blocking=true;recordFinding(d,{...finding("new"),blocking:true,text:"Clarified issue"},"old");expect(d.findings[0]).toMatchObject({id:"old",blocking:true,status:"open",text:"Clarified issue"});});
});

describe("Review acknowledgement across workflow transitions",()=>{
 it("shows thanks before continuing to commercials even after a form is removed",async()=>{const calls:string[]=[];const result={success:"Approved",href:"/admin/courses/course/publish?review=id"};await submitReviewFeedback(async()=>result,{},new FormData(),true,()=>calls.push("thanks"),href=>calls.push(href));expect(calls).toEqual(["thanks",result.href]);});
 it("acknowledges a committed content-only report without commercial navigation",async()=>{const notify=vi.fn(),navigate=vi.fn();await submitReviewFeedback(async()=>({success:"Report saved"}),{},new FormData(),true,notify,navigate);expect(notify).toHaveBeenCalledOnce();expect(navigate).not.toHaveBeenCalled();});
 it("does not display thanks or navigate when approval is rejected",async()=>{const notify=vi.fn(),navigate=vi.fn();await submitReviewFeedback(async()=>({error:"Peer endorsement outstanding"}),{},new FormData(),true,notify,navigate);expect(notify).not.toHaveBeenCalled();expect(navigate).not.toHaveBeenCalled();});
 it("does not interrupt an ordinary finding save with the report acknowledgement",async()=>{const notify=vi.fn(),navigate=vi.fn();await submitReviewFeedback(async()=>({success:"Finding saved"}),{},new FormData(),false,notify,navigate);expect(notify).not.toHaveBeenCalled();expect(navigate).not.toHaveBeenCalled();});
});
