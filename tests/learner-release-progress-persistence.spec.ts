import {beforeEach,describe,expect,it,vi} from "vitest";
const m=vi.hoisted(()=>({fetch:vi.fn()}));
vi.mock("@/server/auth/session",()=>({getSupabaseRestUrl:(path:string)=>`https://example.invalid${path}`}));
import {recordProgressForSession} from "@/server/progress/record-progress";
const session={accessToken:"qa",user:{id:"learner",email:"learner@example.invalid"}};
let rows:Record<string,unknown>[]=[];
beforeEach(()=>{
 vi.clearAllMocks();vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY","qa-key");rows=[{unit_id:"intro",status:"completed",completed_at:"2026-10-25T10:00:00Z"}];
 vi.stubGlobal("fetch",m.fetch);m.fetch.mockImplementation(async(_url:string,options:{method:string})=>options.method==="GET"?Response.json(rows):new Response(null,{status:201}));
});
const save=(eventType:"unit_completed"|"unit_opened"="unit_completed")=>recordProgressForSession({session,courseSlug:"vpshr-level-0",unitSlug:"lu2",eventType,requirePersistence:true});
const posts=()=>m.fetch.mock.calls.filter(([,options])=>options.method==="POST").map(([url,options])=>({url,body:JSON.parse(options.body)}));
describe("Durable completion before advancing",()=>{
 it("persists learner-scoped event, unit completion and course totals",async()=>{
  await save();const writes=posts();expect(writes).toHaveLength(3);expect(writes[0].body.event_key).toBe("learner:vpshr-level-0:lu2:unit_completed");expect(writes[1].body).toMatchObject({user_id:"learner",course_id:"vpshr-level-0",unit_id:"lu2",status:"completed"});expect(writes[2].body).toMatchObject({completed_units:2,total_units:13,status:"in_progress",certificate_eligible:false});
 });
 it("keeps a revisited unit completed and retains its original completion date",async()=>{
  rows.push({unit_id:"lu2",status:"completed",completed_at:"2026-10-25T11:00:00Z"});await save("unit_opened");expect(posts()[1].body).toMatchObject({status:"completed",completed_at:"2026-10-25T11:00:00Z"});expect(posts()[2].body.completed_units).toBe(2);
 });
 it.each(["progress_events","learner_progress","completion_states"])("reports failed %s persistence instead of accepting completion",async failing=>{
  m.fetch.mockImplementation(async(url:string,options:{method:string})=>options.method==="GET"?Response.json(rows):url.includes(`/rest/v1/${failing}?`)?new Response(null,{status:503}):new Response(null,{status:201}));
  await expect(save()).rejects.toThrow(/could not be saved/);
 });
 it.each([new Response(null,{status:503}),Response.json({error:"invalid payload"})])("cannot overwrite totals when the previous progress could not be read",async failure=>{
  m.fetch.mockImplementation(async(_url:string,options:{method:string})=>options.method==="GET"?failure:new Response(null,{status:201}));await expect(save()).rejects.toThrow(/Progress/);expect(posts()).toHaveLength(1);
 });
});
