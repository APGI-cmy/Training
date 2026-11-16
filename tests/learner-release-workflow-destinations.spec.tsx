import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,it,expect,vi} from "vitest";
vi.mock("next/link",()=>({default:({href,children}:{href:string;children:React.ReactNode})=><a href={href}>{children}</a>}));
vi.mock("@/components/reviews/ReviewForms",()=>({ReviewForm:({children,label,disabled}:{children?:React.ReactNode;label:string;disabled?:boolean})=><form>{children}<button disabled={disabled}>{label}</button></form>}));
vi.mock("@/components/reviews/PartnerOfferForm",()=>({PartnerOfferForm:()=> <span>Company acceptance form</span>}));
import {PublicationProgress} from "@/components/reviews/PublicationProgress";
import {WorkflowGuide} from "@/components/reviews/WorkflowGuide";
import {publicationGuide,findWorkflowStep} from "@/lib/publication-guide";
import {commercialReviewPath,commercialSignoffAnchor,commercialReviewerAnchor} from "@/lib/review-navigation";
import {notificationRound,noticeVersion} from "./fixtures/review-notification";
import {canProposeCommercial,readCommercialSuggestion} from "@/lib/commercial-feedback";
describe("Commercial review navigation and saved feedback",()=>{
 it("makes the main commercial tracker a summary link and keeps its tasks in the modal",()=>{
  const r=notificationRound(),steps=publicationGuide(r,"hash",1,"jorrie.jordaan@apginc.ca"),html=renderToStaticMarkup(<WorkflowGuide steps={steps}/>);
  expect(html).toContain(`<a class="workflow-step-link" href="${commercialReviewPath(r.id)}">`);
  expect(html).not.toContain("Show or hide tasks for step 4");expect(html).toContain('approval tasks complete · Open workflow');
  expect(findWorkflowStep(steps,"signoff-jorrie.jordaan@apginc.ca")?.href).toBe(`${commercialReviewPath(r.id)}#commercial-signoff-jorrie`);
  expect(findWorkflowStep(steps,"price")?.href).toBe(`${commercialReviewPath(r.id)}#commercial-version`);
 });
 it("presents Jorrie's full principal proposal and sign-off at the exact linked anchors, without step 6 clearance",()=>{
  const r=notificationRound(),guide=publicationGuide(r,"hash",1,"jorrie.jordaan@apginc.ca"),html=renderToStaticMarkup(<PublicationProgress round={r} principal email="jorrie.jordaan@apginc.ca" hash="hash" brandRevision={1} guide={guide}/>);
  expect(html).toContain("PRIVATE PRINCIPAL SCHEDULE");expect(html).toContain('id="commercial-signoff-jorrie"');expect(html).toContain("Commit my commercial decision");expect(html).not.toContain("final-content-clearance");
  expect(html).toContain('Step 4.3');
 });
 it("shows earlier and current saved reviewer comments beside their exact versions",()=>{
  const r=notificationRound();r.document.taskDecisions=[{id:"saved-review",task:"commercials",target:noticeVersion,email:"jorrie.jordaan@apginc.ca",userId:"jorrie",at:"today",decision:"changes",comment:"A revised distribution is needed."}];
  r.document.commercialFeedback=[{id:"suggestion",versionId:"earlier-version",email:"jorrie.jordaan@apginc.ca",userId:"jorrie",at:"yesterday",comment:"Please explain the assumptions.",apgiShare:"30"}];
  const html=renderToStaticMarkup(<PublicationProgress round={r} principal email="jorrie.jordaan@apginc.ca" hash="hash" brandRevision={1}/>);
  expect(html).toContain('id="commercial-review-entry-saved-review"');expect(html).toContain("A revised distribution is needed.");expect(html).toContain("Earlier version");expect(html).toContain("Please explain the assumptions.");expect(html).toContain(`id="${commercialReviewerAnchor("jorrie.jordaan@apginc.ca")}"`);
 });
 it("retains private principal schedules and unoffered suggestions behind principal access",()=>{
  const r=notificationRound();r.document.commercialFeedback=[{id:"private",versionId:noticeVersion,email:"jorrie.jordaan@apginc.ca",userId:"jorrie",at:"today",comment:"PRIVATE PRINCIPAL DISCUSSION"}];
  const html=renderToStaticMarkup(<PublicationProgress round={r} principal={false} email="reviewer@example.com" hash="hash" brandRevision={1}/>);
  expect(html).not.toContain("PRIVATE PRINCIPAL");expect(canProposeCommercial(r,"reviewer@example.com",false)).toBe(false);
 });
 it("allows version-bound principal discussion during a content correction without enabling formal sign-off",()=>{
  const r=notificationRound();expect(canProposeCommercial(r,"jorrie.jordaan@apginc.ca",true)).toBe(true);
  const html=renderToStaticMarkup(<PublicationProgress round={r} principal email="jorrie.jordaan@apginc.ca" hash="new-content" brandRevision={1}/>);
  expect(html).toContain('disabled=""');expect(html).toContain("Save my comment or counter-proposal");
 });
 it("does not allow unassigned, declined, expired or closed-review proposals",()=>{
  const r=notificationRound();r.document.workflow!.commercials[0].offeredAt="today";
  expect(canProposeCommercial(r,"stranger@example.com",false)).toBe(false);
  r.document.participants[2].state="declined";expect(canProposeCommercial(r,"reviewer@example.com",false)).toBe(false);
  r.document.cutoff="2000-01-01";expect(canProposeCommercial(r,"jorrie.jordaan@apginc.ca",true)).toBe(false);
  r.document.cutoff="2099-01-01";r.status="cancelled";expect(canProposeCommercial(r,"jorrie.jordaan@apginc.ca",true)).toBe(false);
 });
 it("validates optional proposal figures without modifying commercial terms or the negotiation count",()=>{
  const r=notificationRound(),before=JSON.stringify(r.document.workflow),form=new FormData();form.set("comment","Please consider this distribution.");form.set("proposal_apgi_share","30");
  expect(readCommercialSuggestion(form)).toEqual({comment:"Please consider this distribution.",apgiShare:"30"});expect(JSON.stringify(r.document.workflow)).toBe(before);
  form.set("proposal_apgi_share","101");expect(()=>readCommercialSuggestion(form)).toThrow();
 });
 it("marks rejected saved pricing as requiring revision in both tracker and proposal card",()=>{
  const r=notificationRound();r.document.workflow!.stage="commercial_draft";r.document.workflow!.commercials[0].decisions.push({email:"jorrie.jordaan@apginc.ca",userId:"jorrie",at:"today",decision:"reject",reason:"Revise the proposal."});
  expect(findWorkflowStep(publicationGuide(r,"hash",1,"johan.ras@apginc.ca"),"price")?.done).toBe(false);
 });
 it("does not merge distinct reviewer addresses into one destination",()=>{expect(commercialReviewerAnchor("a-b@example.com")).not.toBe(commercialReviewerAnchor("a@b-example.com"));expect(commercialSignoffAnchor("jorrie.jordaan@apginc.ca")).toBe("commercial-signoff-jorrie");});
});
