import {beforeEach,describe,it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({rest:vi.fn()}));
vi.mock("@/server/supabase/admin-rest",()=>({adminRest:m.rest}));
vi.mock("@/server/auth/session",()=>({getSupabaseRestUrl:(path:string)=>path}));
import {getAvailableCourseIds} from "@/server/services/organisations/get-organisations";
const course="tiger-kidnapping-telecommunications";
function response(data:unknown,status=200){return new Response(JSON.stringify(data),{status});}
function setup({published=true,member=true}={}){
 m.rest.mockImplementation(async(path:string)=>{
  if(path.startsWith("/rest/v1/learner_organisations"))return response(member?[{organisation:{id:"company-a",name:"Company A"}}]:[]);
  if(path.startsWith("/rest/v1/course_catalogue_settings"))return response([{course_id:course,visibility:"client_specific"},{course_id:"vpshr-level-0",visibility:"public"}]);
  if(path.startsWith("/rest/v1/organisation_course_availability"))return response([]);
  if(path.startsWith("/rest/v1/organisation_offerings")){expect(path).toContain("organisation_id=eq.company-a");expect(path).toContain("status=eq.published");expect(path).toContain("reviewed_release_id=not.is.null");return response(published?[{course_id:course}]:[]);}
  throw Error("Unexpected request");
 });
}
beforeEach(()=>vi.clearAllMocks());
describe("Company-specific reviewed course catalogue",()=>{
 it("makes a company's published reviewed offering available to its learners",async()=>{setup();expect(await getAvailableCourseIds("learner",[course,"vpshr-level-0"])).toEqual(new Set(["vpshr-level-0",course]));});
 it("keeps a draft or unpublished company course out of learner offerings",async()=>{setup({published:false});expect(await getAvailableCourseIds("learner",[course,"vpshr-level-0"])).toEqual(new Set(["vpshr-level-0"]));});
 it("does not query another company's offerings for an unaffiliated learner",async()=>{setup({member:false});expect(await getAvailableCourseIds("learner",[course,"vpshr-level-0"])).toEqual(new Set(["vpshr-level-0"]));expect(m.rest.mock.calls.some(([path])=>String(path).startsWith("/rest/v1/organisation_offerings"))).toBe(false);});
 it("does not expose a private course when catalogue settings cannot be read",async()=>{m.rest.mockResolvedValue(response({},503));expect(await getAvailableCourseIds("learner",[course])).toEqual(new Set());});
});
