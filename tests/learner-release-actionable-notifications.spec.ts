import {describe,it,expect} from "vitest";
import {reviewNotificationTasks} from "@/lib/review-notification-tasks";
import {presentNotification} from "@/lib/notification-presentation";
import {notificationTarget,notificationReference,type PersonalNotification} from "@/lib/notifications";
import {notificationRound,noticeRoundId,noticeVersion} from "./fixtures/review-notification";
const notice=(overrides:Partial<PersonalNotification>={}):PersonalNotification=>({id:"55555555-5555-4555-8555-555555555555",reference_number:42,kind:"platform_event",message:"Old update",created_at:"today",read_at:null,acknowledged_at:null,response_type:"read",pending:false,target_path:`/course-reviews/${noticeRoundId}`,actor_user_id:"jorrie",source_type:"review",source_id:noticeRoundId,...overrides});
describe("Specific workflow notifications and their outcomes",()=>{
 it("separates unit coverage, assigned review, branding and formal commercial sign-off",()=>{
  const tasks=reviewNotificationTasks({round:notificationRound(),hash:"hash",brandRevision:1},"jorrie.jordaan@apginc.ca","jorrie",true);
  const sign=tasks.find(t=>t.key.includes(":signoff:"))!;
  expect(sign.anchor).toBe("commercial-signoff-jorrie");expect(sign.path).toBe(`/course-reviews/${noticeRoundId}/commercials`);expect(sign.requirement).toContain("full recorded commercial version");
  expect(tasks.find(t=>t.key.includes(":coverage:"))?.anchor).toBe("review-units");expect(tasks.find(t=>t.key.includes(":branding:"))?.anchor).toBe("branding-review");
  expect(new Set(tasks.map(t=>t.key)).size).toBe(tasks.length);
 });
 it("stops asking for a formal signature after the exact actor's decision is saved",()=>{
  const r=notificationRound();r.document.workflow!.commercials[0].decisions.push({email:"jorrie.jordaan@apginc.ca",userId:"jorrie",at:"today",decision:"approve",reason:"Checked this version."});
  const tasks=reviewNotificationTasks({round:r,hash:"hash",brandRevision:1},"jorrie.jordaan@apginc.ca","jorrie",true);
  expect(tasks.some(t=>t.key.includes(":signoff:"))).toBe(false);expect(tasks.some(t=>t.key.includes(":commercial-review:"))).toBe(false);
 });
 it("treats changes requested as a submitted review response, without claiming that approval is complete",()=>{
  const r=notificationRound();r.document.taskDecisions=[{id:"decision",task:"commercials",target:noticeVersion,email:"jorrie.jordaan@apginc.ca",userId:"jorrie",at:"today",decision:"changes",comment:"Revise the model."}];
  const tasks=reviewNotificationTasks({round:r,hash:"hash",brandRevision:1},"jorrie.jordaan@apginc.ca","jorrie",true);
  expect(tasks.some(t=>t.key.includes(":commercial-review:"))).toBe(false);expect(tasks.some(t=>t.key.includes(":signoff:"))).toBe(true);
 });
 it("does not carry a signature or a completed action into a new commercial version",()=>{
  const r=notificationRound();r.document.workflow!.commercials[0].decisions.push({email:"jorrie.jordaan@apginc.ca",userId:"jorrie",at:"today",decision:"approve",reason:"Checked"});
  r.document.workflow!.commercials.push({...r.document.workflow!.commercials[0],id:"new-version",decisions:[]});
  expect(reviewNotificationTasks({round:r,hash:"hash",brandRevision:1},"jorrie.jordaan@apginc.ca","jorrie",true).some(t=>t.key.includes(":signoff:new-version"))).toBe(true);
 });
 it("does not generate another reviewer's tasks or tasks for a closed round",()=>{
  const r=notificationRound();expect(reviewNotificationTasks({round:r,hash:"hash",brandRevision:1},"outsider@example.com","outsider",false)).toEqual([]);
  r.status="cancelled";expect(reviewNotificationTasks({round:r,hash:"hash",brandRevision:1},"jorrie.jordaan@apginc.ca","jorrie",true)).toEqual([]);
 });
 it("does not offer content approvals or a self-endorsement before prerequisites are met",()=>{
  const r=notificationRound();r.document.reports=[{id:"own-report",email:"jorrie.jordaan@apginc.ca",userId:"jorrie",at:"today",text:"Report",coverage:["lu1"],endorsements:[]}];
  const tasks=reviewNotificationTasks({round:r,hash:"new-content",brandRevision:1},"jorrie.jordaan@apginc.ca","jorrie",true);
  expect(tasks.some(t=>t.key.includes(":deployment:"))).toBe(true);expect(tasks.some(t=>t.key.includes(":clearance:")||t.key.includes(":endorse:")||t.key.includes(":coverage:"))).toBe(false);
 });
 it("links an eligible independent check to the exact submitted report",()=>{
  const r=notificationRound();r.document.reports=[{id:"report-id",email:"johan.ras@apginc.ca",userId:"johan",at:"today",text:"Full report",coverage:["lu1"],endorsements:[]}];
  const task=reviewNotificationTasks({round:r,hash:"hash",brandRevision:1},"jorrie.jordaan@apginc.ca","jorrie",true).find(t=>t.key.includes(":endorse:"));
  expect(task?.anchor).toBe("report-report-id");expect(task?.requirement).toContain("johan.ras@apginc.ca");
 });
 it("does not generate a revise-pricing task for a saved version merely awaiting submission",()=>{
  const r=notificationRound();r.document.workflow!.stage="commercial_draft";delete r.document.workflow!.commercials[0].submittedAt;
  const tasks=reviewNotificationTasks({round:r,hash:"hash",brandRevision:1},"jorrie.jordaan@apginc.ca","jorrie",true);
  expect(tasks.some(t=>t.key.includes(":pricing:"))).toBe(false);expect(tasks.some(t=>t.key.includes(":submit:"))).toBe(true);
 });
 it("uses stable notification references instead of list position",()=>{expect(notificationReference(notice())).toBe("Notification 42");});
 it("opens a task-decision update at the saved comment, with its requirement explained",()=>{
  const n=presentNotification(notice({event:{action:"task_decision",actor:"jorrie.jordaan@apginc.ca",task_decision:{id:"saved-comment",task:"commercials",email:"jorrie.jordaan@apginc.ca",target:noticeVersion,decision:"changes",comment:"Revise the distribution."}}}),notificationRound(),true,"johan.ras@apginc.ca");
  expect(n.target_path).toBe(`/course-reviews/${noticeRoundId}/commercials#commercial-review-entry-saved-comment`);expect(n.requirement).toContain("Revise the distribution.");expect(n.message).toContain("requested changes");expect(n.event).toBeUndefined();
 });
 it("does not send private, unoffered principal explanations to a company reviewer",()=>{
  const n=presentNotification(notice({event:{action:"task_decision",task_decision:{id:"private",task:"commercials",email:"jorrie.jordaan@apginc.ca",target:noticeVersion,decision:"changes",comment:"PRIVATE INTERNAL REASON"}}}),notificationRound(),false,"reviewer@example.com");
  expect(JSON.stringify(n)).not.toContain("PRIVATE INTERNAL REASON");
 });
 it("retains resolved and read history while explaining that the closed round needs no response",()=>{
  const r=notificationRound();r.status="cancelled";const n=presentNotification(notice({read_at:"yesterday",context:{review_task:"signoff",task_pending:false,resolved_at:"today",requirement:"Review the exact terms."}}),r,true);
  expect(n.read_at).toBe("yesterday");expect(n.resolved_at).toBe("today");expect(n.requirement).toContain("no further response");expect(n.pending).toBe(false);
 });
 it.each([`/course-reviews/${noticeRoundId}/commercials#commercial-signoff-jorrie`,`/course-reviews/${noticeRoundId}#report-abc`])("permits the exact safe destination %s",target=>expect(notificationTarget(target)).toBe(target));
 it.each([`/course-reviews/${noticeRoundId}/commercials/../../admin`,`https://evil.test/course-reviews/${noticeRoundId}/commercials`,`/course-reviews/${noticeRoundId}?next=evil`])("rejects unrelated destination %s",target=>expect(notificationTarget(target)).toBe("/notifications"));
});
