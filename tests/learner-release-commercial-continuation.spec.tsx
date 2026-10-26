import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach,describe,expect,it,vi} from "vitest";
const saved=vi.hoisted(()=>({state:{} as {success?:string;link?:string},pending:false}));
vi.mock("react",async original=>({...await original<typeof import("react")>(),useActionState:()=>[saved.state,()=>{},saved.pending]}));
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock("next/link",()=>({default:({href,children}:{href:string;children:React.ReactNode})=><a href={href}>{children}</a>}));
vi.mock("@/server/actions/platform-policies",()=>({saveCommercialDraft:vi.fn()}));
import {CoursePlanForm,PlanSharingFields} from "@/components/admin/CoursePlanForm";
const render=()=>renderToStaticMarkup(<CoursePlanForm companies={[]} courses={[]} costProfiles={[]} principalId="qa" workflowContext={{id:"qa-review",ownerId:"qa-company",designerName:"QA",designerCompany:"QA"}}/>);
describe("Saved commercial workflow continuation",()=>{
 beforeEach(()=>{saved.state={success:"Draft saved",link:"/course-reviews/qa-review"};saved.pending=false;});
 it("keeps continuation available when saved values are normalised or later edited",()=>{const html=render();expect(html).toContain('href="/course-reviews/qa-review"');expect(html).toContain("Continue with saved commercial version");expect(html).toContain("Save again to include any later changes");});
 it("does not offer continuation before a successful save returns its workflow link",()=>{saved.state={};expect(render()).not.toContain("Continue with saved commercial version");});
 it("waits for the current save to finish before showing continuation",()=>{saved.pending=true;expect(render()).not.toContain("Continue with saved commercial version");});
});

describe("Standard and tailored sharing choices",()=>{
 it("offers three exclusive models and no percentage entry for a standard model",()=>{
  const html=renderToStaticMarkup(<PlanSharingFields model="owner" apgiShare="" reason="" standardShare="20" onChange={()=>{}}/>);
  expect(html.match(/<option /g)).toHaveLength(3);expect(html).toContain("APGI 20.00% · Partner 80.00%");expect(html).not.toContain('name="apgi_share"');expect(html).not.toContain('name="tailored_reason"');expect(html).not.toContain('type="checkbox"');
 });
 it("shows both tailored shares, a required reason and an automatically calculated remainder",()=>{
  const html=renderToStaticMarkup(<PlanSharingFields model="tailored" apgiShare="32.5" reason="Specific support obligations" standardShare={null} onChange={()=>{}}/>);
  expect(html).toContain('name="apgi_share"');expect(html).toContain('name="platform_user_share"');expect(html).toContain('readOnly=""');expect(html).toContain('value="67.50"');expect(html).toContain('name="tailored_reason"');expect(html).toContain('minLength="5"');
 });
 it("asks explicitly for one of the three ownership models",()=>{
  saved.state={};const html=render();expect(html).toContain('name="ownership_model"');expect(html).toContain('value="apgi_permanent"');expect(html).toContain('value="apgi_until_recovered"');expect(html).toContain('value="partner_paid"');
 });
});
