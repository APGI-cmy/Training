import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getCourses } from "@/lib/courses";
import { unitProgressDisplay, type ProgressEvidence } from "@/lib/learning-progress-display";
import { TIGER_POLICY_VERSION } from "@/lib/tiger-progression";
import { UnitProgressBreakdown } from "@/components/course/UnitProgressBreakdown";
const m = vi.hoisted(() => ({read: vi.fn()}));
vi.mock("@/server/supabase/admin-rest", () => ({adminRest: m.read}));
import { loadProgressDisplayEvidence } from "@/server/services/learning-progress-display";

const course = getCourses().find(c => c.id === "tiger-kidnapping-telecommunications")!;
const unit = course.units[0];
const stamp = "2026-11-22T10:00:00Z";
const record = {user_id:"qa",course_id:course.id,unit_id:unit.id,updated_at:stamp};
const empty = (): ProgressEvidence => ({learning:[],scorm:[],tiger:[],sequence:[],available:true,detailedAvailable:true});

describe("Read-only unit progress reporting", () => {
  it("shows partial work while keeping zero completed units", () => {
    const evidence = empty();
    evidence.scorm = [{...record,completion_status:"incomplete",success_status:"unknown",progress_measure:0.54545,score_raw:0}];
    evidence.tiger = [{...record,edition_key:"legacy",policy_version:TIGER_POLICY_VERSION,video_ranges:[[0,75]],summaries:["TK-LU01-F01@3","TK-LU01-F02@4","TK-LU01-F03@5"],quiz_passed:false,qualified_at:null}];
    evidence.sequence = [{...record,edition_key:"legacy",begun:true,through_step:2,step_count:4,summary_opened:false}];
    const before = JSON.stringify(evidence);
    const units = unitProgressDisplay(course,"qa",evidence);
    expect(units[0]).toMatchObject({state:"In progress",video:"100% watched · 80% required",activities:"3 of 8 activity summaries saved · current activity: 3 of 4 sections opened",quiz:"No pass recorded · 80% required",presentationPercent:54});
    expect(units.filter(u => u.state === "Completed")).toHaveLength(0);
    expect(JSON.stringify(evidence)).toBe(before);
    const html = renderToStaticMarkup(createElement(UnitProgressBreakdown,{units,courseTitle:course.title}));
    expect(html).toContain("View unit progress · 1 in progress");
    expect(html).toContain("3 of 8 activity summaries saved");
  });
  it("never leaks another user's, course's or edition's evidence", () => {
    const evidence = empty();
    const full = {...record,edition_key:"legacy",policy_version:TIGER_POLICY_VERSION,video_ranges:[[0,75]] as [number,number][],summaries:[],quiz_passed:true,qualified_at:stamp};
    evidence.tiger = [{...full,user_id:"other"},{...full,course_id:"other"},{...full,edition_key:"old-edition"},{...full,policy_version:"old-policy"}];
    expect(unitProgressDisplay(course,"qa",evidence)[0]).toMatchObject({state:"Not started",video:"0% watched · 80% required",quiz:"No pass recorded · 80% required"});
  });
  it("merges overlapping watch ranges and does not pass quizzes from score alone", () => {
    const evidence = empty();
    evidence.tiger = [{...record,edition_key:"legacy",policy_version:TIGER_POLICY_VERSION,video_ranges:[[0,30],[15,45]],summaries:[],quiz_passed:false,qualified_at:null}];
    evidence.scorm = [{...record,completion_status:"incomplete",success_status:"failed",score_raw:4,score_max:5}];
    expect(unitProgressDisplay(course,"qa",evidence)[0]).toMatchObject({state:"In progress",video:"60% watched · 80% required",quiz:"Not yet passed · latest score 80%"});
  });
  it("retains historical completed units without inventing separate video evidence", () => {
    const evidence = empty();
    evidence.scorm = [{...record,completion_status:"completed",success_status:"passed",score_raw:5,score_max:5}];
    expect(unitProgressDisplay(course,"qa",evidence)[0]).toMatchObject({state:"Completed",video:"Earlier completion retained",activities:"Earlier completion retained",quiz:"Passed · 100%"});
  });
  it("labels unavailable evidence and unsupported course metrics honestly", () => {
    expect(unitProgressDisplay(course,"qa",{...empty(),available:false})[0].state).toBe("Unavailable");
    const generic = {...course,id:"generic",baseCourseId:undefined};
    expect(unitProgressDisplay(generic,"qa",empty())[0].video).toBe("Not reported separately by this course");
    expect(unitProgressDisplay(course,"qa",{...empty(),detailedAvailable:false})[0].activities).toBe("Detailed progress temporarily unavailable");
  });
});

describe("Progress evidence reads", () => {
  beforeEach(() => vi.resetAllMocks());
  it("paginates more than 1000 saved activities without any writes", async () => {
    m.read.mockImplementation(async (url:string,init:RequestInit) => {
      expect(init.method).toBeUndefined();
      expect(url).toContain("user_id=in.(qa)");
      const activity = url.includes("/training_sequence_progress?");
      const first = (init.headers as Record<string,string>).Range === "0-999";
      return Response.json(activity ? Array.from({length:first?1000:2},()=>({...record})) : []);
    });
    const evidence = await loadProgressDisplayEvidence(["qa"]);
    expect(evidence.available).toBe(true);
    expect(evidence.sequence).toHaveLength(1002);
    expect(m.read).toHaveBeenCalledTimes(5);
  });
  it("reports failed detail reads instead of showing fabricated zero progress", async () => {
    m.read.mockImplementation(async (url:string) => url.includes("/tiger_unit_progress?") ? new Response(null,{status:503}) : Response.json([]));
    const result = await loadProgressDisplayEvidence(["qa"]);
    expect(result.available).toBe(true);
    expect(result.detailedAvailable).toBe(false);
  });
});
