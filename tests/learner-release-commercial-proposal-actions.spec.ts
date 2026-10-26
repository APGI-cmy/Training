import {beforeEach,describe,it,expect,vi} from "vitest";
import {notificationRound,noticeRoundId,noticeVersion} from "./fixtures/review-notification";
const m=vi.hoisted(()=>({access:vi.fn(),commit:vi.fn(),mail:vi.fn(()=>[]),process:vi.fn(),claim:vi.fn()}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
vi.mock("@/server/services/course-reviews",()=>({requireReview:m.access,commitReview:m.commit,reviewMail:m.mail,processReviewMail:m.process,claimReviewer:m.claim,reviewEvent:vi.fn()}));
import {courseReviewAction} from "@/server/actions/course-reviews";
const form=()=>{const f=new FormData();f.set("round_id",noticeRoundId);f.set("operation","commercial_proposal");f.set("version_id",noticeVersion);f.set("comment","Please consider a revised distribution.");f.set("proposal_apgi_share","30");f.set("user_id","forged");return f;};
const access=()=>({round:notificationRound(),email:"jorrie.jordaan@apginc.ca",principal:true,fresh:false,session:{user:{id:"jorrie",email:"jorrie.jordaan@apginc.ca"}},source:{fingerprint:"changed-content",brand:{brand_revision:1}}});
beforeEach(()=>{vi.clearAllMocks();m.access.mockResolvedValue(access());m.commit.mockResolvedValue(undefined);});
describe("Saved commercial discussion proposals",()=>{
 it("saves a version-bound suggestion under the verified actor and returns its exact visible location",async()=>{
  const a=access(),before=JSON.stringify(a.round.document.workflow);m.access.mockResolvedValue(a);const result=await courseReviewAction({},form());
  expect(result.error).toBeUndefined();expect(a.round.document.commercialFeedback).toHaveLength(1);expect(a.round.document.commercialFeedback![0]).toMatchObject({versionId:noticeVersion,email:"jorrie.jordaan@apginc.ca",userId:"jorrie",apgiShare:"30"});expect(result.href).toContain(`/commercials#commercial-feedback-${a.round.document.commercialFeedback![0].id}`);
  expect(JSON.stringify(a.round.document.workflow)).toBe(before);expect(m.commit).toHaveBeenCalledOnce();expect(m.mail).not.toHaveBeenCalled();expect(m.process).not.toHaveBeenCalled();
 });
 it("rejects a stale financial version instead of attaching suggestions to a different proposal",async()=>{const f=form();f.set("version_id","stale");expect((await courseReviewAction({},f)).error).toContain("version changed");expect(m.commit).not.toHaveBeenCalled();});
 it("rejects an unoffered company-reviewer proposal",async()=>{const a=access();a.principal=false;a.email="reviewer@example.com";a.session.user.id="reviewer";m.access.mockResolvedValue(a);expect((await courseReviewAction({},form())).error).toContain("assigned reviewer of an offered version");expect(m.commit).not.toHaveBeenCalled();});
 it("allows an assigned company reviewer to discuss the offered exact version without principal rights",async()=>{const a=access();a.principal=false;a.email="reviewer@example.com";a.session.user.id="reviewer";a.round.document.workflow!.commercials[0].offeredAt="today";m.access.mockResolvedValue(a);expect((await courseReviewAction({},form())).error).toBeUndefined();expect(a.round.document.commercialFeedback![0].userId).toBe("reviewer");});
 it("rejects invalid percentages and does not commit partially validated figures",async()=>{const f=form();f.set("proposal_apgi_share","101");expect((await courseReviewAction({},f)).error).toBeDefined();expect(m.commit).not.toHaveBeenCalled();});
 it("does not bypass a bound review identity",async()=>{m.claim.mockImplementationOnce(()=>{throw Error("The reviewer account does not match the bound identity.");});expect((await courseReviewAction({},form())).error).toContain("bound identity");expect(m.commit).not.toHaveBeenCalled();});
});
