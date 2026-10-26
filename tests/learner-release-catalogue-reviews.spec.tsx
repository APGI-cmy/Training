import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach,describe,expect,it,vi} from "vitest";
const m=vi.hoisted(()=>({rest:vi.fn(),principal:vi.fn(),available:vi.fn(),enrolled:false,session:{accessToken:"qa",user:{id:"actor",email:"reviewer@example.com",email_confirmed_at:"now"}}}));
vi.mock("next/link",()=>({default:({href,children,...props}:{href:string;children:React.ReactNode})=><a href={href} {...props}>{children}</a>}));
vi.mock("@/server/supabase/admin-rest",()=>({adminRest:m.rest}));
vi.mock("@/server/services/platform-principals",()=>({isPlatformPrincipal:m.principal}));
vi.mock("@/server/auth/session",()=>({requireSession:async()=>m.session}));
vi.mock("@/server/auth/learner-onboarding",()=>({requireLearnerProfile:vi.fn()}));
vi.mock("@/server/services/organisations/get-organisations",()=>({getAvailableCourseIds:m.available}));
vi.mock("@/server/services/commerce/get-course-commerce",()=>({getCourseCommerceSettings:async()=>new Map()}));
vi.mock("@/lib/services/enrolments/get-course-access",()=>({getCourseAccess:async({courseId}:{courseId:string})=>({status:m.enrolled&&courseId==="vpshr-level-0"?"enrolled":"not_enrolled"})}));
import {getCatalogueReviews} from "@/server/services/organisations/get-catalogue-reviews";
import CataloguePage from "../app/(learner)/catalogue/page";
const course="tiger-kidnapping-telecommunications";
const row={id:"review-id",course_id:course,status:"open",document:{brand:{name:"NKS Capital"},participants:[{email:"reviewer@example.com",state:"invited"}],workflow:{stage:"apgi_approval"}}};
beforeEach(()=>{vi.clearAllMocks();m.enrolled=false;m.principal.mockResolvedValue(false);m.available.mockResolvedValue(new Set(["vpshr-level-0","scannex-training-programme"]));m.rest.mockResolvedValue(new Response(JSON.stringify([row])));});

describe("Private reviews in the signed-in course catalogue",()=>{
 it("shows Tiger Kidnapping as under review with a review link rather than learner enrolment",async()=>{
  const html=renderToStaticMarkup(await CataloguePage({}));
  expect(html).toContain("Tiger Kidnapping in Telecommunications");expect(html).toContain("NKS Capital");expect(html).toContain("Status: Under review");expect(html).toContain("Commercial sign-off");expect(html).toContain('href="/course-reviews/review-id"');expect(html).not.toContain('href="/courses/tiger-kidnapping-telecommunications"');expect(html.match(/Enrol now/g)).toHaveLength(2);
 });
 it("keeps private review cards out of My learning and skips their lookup",async()=>{
  m.enrolled=true;const html=renderToStaticMarkup(await CataloguePage({searchParams:Promise.resolve({view:"my-learning"})}));
  expect(html).toContain("VPSHR Level 0");expect(html).not.toContain("Tiger Kidnapping");expect(m.principal).not.toHaveBeenCalled();expect(m.rest).not.toHaveBeenCalled();
 });
 it("keeps the private course visible to its review team after publication without granting learner access",async()=>{
  m.rest.mockResolvedValue(new Response(JSON.stringify([{...row,status:"published",document:{...row.document,workflow:{stage:"published"}}}])));
  const html=renderToStaticMarkup(await CataloguePage({}));expect(html).toContain("Published company course");expect(html).toContain("View publication record");expect(html).toContain("Learner access is managed by NKS Capital");expect(html).not.toContain('href="/courses/tiger-kidnapping-telecommunications"');
 });
 it("does not duplicate a course that already has a learner catalogue entry",async()=>{
  m.available.mockResolvedValue(new Set([course]));const html=renderToStaticMarkup(await CataloguePage({}));expect(html.match(/<h2>Tiger Kidnapping/g)).toHaveLength(1);expect(html).not.toContain("Open course review");
 });
 it("filters review rows by the verified invited email even if a server response contains another user's row",async()=>{
  m.rest.mockResolvedValue(new Response(JSON.stringify([{...row,document:{...row.document,participants:[{email:"other@example.com",state:"invited"}]}}])));
  expect((await getCatalogueReviews(m.session,[course])).size).toBe(0);expect(m.rest.mock.calls[0][0]).toContain("document->participants=cs.");
 });
 it("does not list a declined assignment",async()=>{
  m.rest.mockResolvedValue(new Response(JSON.stringify([{...row,document:{...row.document,participants:[{email:"reviewer@example.com",state:"declined"}]}}])));
  expect((await getCatalogueReviews(m.session,[course])).size).toBe(0);
 });
 it("lets a verified platform principal find a private course without a learner organisation",async()=>{
  m.principal.mockResolvedValue(true);m.rest.mockResolvedValue(new Response(JSON.stringify([{...row,document:{...row.document,participants:[]}}])));
  expect((await getCatalogueReviews(m.session,[course])).get(course)?.company).toBe("NKS Capital");expect(m.rest.mock.calls[0][0]).not.toContain("document->participants");
 });
 it("fails closed when review access is unavailable or the email is unverified",async()=>{
  m.rest.mockResolvedValue(new Response("Unavailable",{status:503}));expect((await getCatalogueReviews(m.session,[course])).size).toBe(0);
  m.rest.mockClear();expect((await getCatalogueReviews({...m.session,user:{...m.session.user,email_confirmed_at:null}},[course])).size).toBe(0);expect(m.rest).not.toHaveBeenCalled();
 });
});
