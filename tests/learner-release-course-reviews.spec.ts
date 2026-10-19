import {describe,it,expect} from "vitest";
import {canWork,currentReport,needsReminder,reviewBlockers,reviewPeople,type ReviewRound,type ReviewReport} from "@/lib/course-review";
import {claimReviewer,assertReviewWork} from "@/server/services/course-reviews";
function round():ReviewRound{
 const people=reviewPeople(["johan@example.com","jorrie@example.com"],["primary","primary"],"johan@example.com");
 people.forEach((p,i)=>{p.state="finished";p.userId=`user-${i}`;p.coverage=["lu1","quiz"];});
 const reports:ReviewReport[]=people.map((p,i)=>({id:`r${i}`,email:p.email,userId:p.userId!,at:"2026-10-18T08:00:00Z",text:"Reviewed",coverage:[...p.coverage],endorsements:[{email:people[1-i].email,userId:people[1-i].userId!,at:"2026-10-18T09:00:00Z",decision:"approve",text:"Checked independently"}]}));
 return {id:"round",plan_id:"plan",course_id:"course",organisation_id:"company",fingerprint:"hash",revision:1,status:"open",created_at:"2026-10-18T07:00:00Z",document:{title:"Course",brand:{name:"Brand",revision:1,color:"#102b47",logo:null},requester:people[0].email,requesterId:people[0].userId!,cutoff:"2026-11-01T10:00:00Z",units:[{slug:"lu1",title:"Unit"},{slug:"quiz",title:"Final quiz"}],participants:people,reports,findings:[],events:[],terms:{partner:false,text:"Saved schedule",acceptor:""}}};
}
describe("Course review publication gates",()=>{
 it("allows two full reviewers with reciprocal independent report endorsements",()=>expect(reviewBlockers(round(),"hash")).toEqual([]));
 it("requires the requester and two full reviewers, not only optional peers",()=>{
  expect(()=>reviewPeople(["a@b.com","c@d.com"],["primary","peer"],"a@b.com")).toThrow(/two full|other full/);
  expect(()=>reviewPeople(["a@b.com","c@d.com"],["primary","primary"],"x@y.com")).toThrow();
 });
 it("normalizes email and rejects duplicate reviewer identities",()=>expect(()=>reviewPeople([" A@b.com ","a@b.com"],[],"a@b.com")).toThrow());
 it("supports more than twenty reviewers",()=>expect(reviewPeople(Array.from({length:30},(_,i)=>`r${i}@example.com`),[],"r0@example.com")).toHaveLength(30));
 it.each(["changed-content","changed-brand","changed-price"])("blocks stale %s fingerprint",value=>expect(reviewBlockers(round(),value).join()).toMatch(/changed/));
 it("cannot publish with incomplete unit or quiz coverage",()=>{const r=round();r.document.reports[0].coverage=["lu1"];expect(reviewBlockers(r,"hash").join()).toMatch(/coverage/);});
 it("distinguishes saved complete coverage from an unsubmitted report",()=>{const r=round();r.document.participants[0].state="active";r.document.reports=r.document.reports.filter(x=>x.email!==r.document.participants[0].email);const messages=reviewBlockers(r,"hash");expect(messages.join()).toMatch(/submit your completed full review report/);expect(messages.some(x=>x.includes("johan@example.com")&&x.includes("coverage"))).toBe(false);});
 it("does not count an unsubmitted report or decline as approval",()=>{const r=round();r.document.participants[1].state="declined";expect(reviewBlockers(r,"hash").join()).toMatch(/decline|two full/);});
 it("rejects self endorsement, including matching account under another address",()=>{const r=round();r.document.reports[0].endorsements[0].userId="user-0";expect(reviewBlockers(r,"hash").join()).toMatch(/endorsement/);});
 it("requires fresh endorsement after a report revision",()=>{const r=round();r.document.reports.push({...r.document.reports[0],id:"r0-v2",endorsements:[]});expect(currentReport(r.document,"johan@example.com")?.id).toBe("r0-v2");expect(reviewBlockers(r,"hash").join()).toMatch(/endorsement/);});
 it("does not treat a request for report changes as an approval",()=>{const r=round();r.document.reports[0].endorsements[0].decision="changes";expect(reviewBlockers(r,"hash").join()).toMatch(/requested changes/);});
 it("does not require all optional peer checkers to finish",()=>{const r=round();r.document.participants.push({email:"optional@example.com",role:"peer",state:"invited",coverage:[]});expect(reviewBlockers(r,"hash")).toEqual([]);});
 it("blocks unresolved defects even when all reports are endorsed",()=>{const r=round();r.document.findings.push({id:"f",unit:"lu1",reference:"Q1",category:"Scoring",blocking:true,author:"a",userId:"u",at:"now",text:"Wrong answer",status:"fixed",fixedBy:"u",replies:[]});expect(reviewBlockers(r,"hash").join()).toMatch(/blocking/);r.document.findings[0].status="closed";expect(reviewBlockers(r,"hash")).toEqual([]);});
 it("requires company acceptance independently of content endorsements",()=>{const r=round();r.document.terms.partner=true;expect(reviewBlockers(r,"hash").join()).toMatch(/commercial/);r.document.terms.decision="rejected";expect(reviewBlockers(r,"hash")).not.toEqual([]);r.document.terms.decision="accepted";expect(reviewBlockers(r,"hash")).toEqual([]);});
 it("never approves an unfinished task just because its deadline passed",()=>{const r=round();r.document.cutoff="2026-01-01T00:00:00Z";r.document.participants[0].state="active";r.document.reports=[];expect(canWork(r)).toBe(false);expect(reviewBlockers(r,"hash")).not.toEqual([]);expect(()=>assertReviewWork(r,true)).toThrow(/extend/);});
 it.each(["finished","declined"] as const)("stops reminders when the reviewer is %s",state=>{const r=round();r.document.participants[0].state=state;expect(needsReminder(r,r.document.participants[0],Date.parse("2026-10-19"))).toBe(false);});
 it("stops reminders exactly at cutoff and after cancellation",()=>{const r=round();const p=r.document.participants[0];p.state="active";expect(needsReminder(r,p,Date.parse(r.document.cutoff)-1)).toBe(true);expect(needsReminder(r,p,Date.parse(r.document.cutoff))).toBe(false);r.status="cancelled";expect(needsReminder(r,p,Date.parse("2026-10-19"))).toBe(false);});
 it("rejects attempts to claim two reviewer slots with one account",()=>{const r=round();expect(()=>claimReviewer(r,"jorrie@example.com","user-0")).toThrow();});
 it("rejects unassigned and declined reviewers",()=>{const r=round();expect(()=>claimReviewer(r,"outsider@example.com","x")).toThrow();r.document.participants[0].state="declined";expect(()=>claimReviewer(r,"johan@example.com","user-0")).toThrow();});
 it("binds an invited reviewer to the verified account",()=>{const r=round();const p=r.document.participants[0];delete p.userId;p.state="invited";claimReviewer(r,p.email,"new-user");expect(p).toMatchObject({userId:"new-user",state:"active"});});
});
