import React from "react";
import {createHash} from "node:crypto";
import {readFileSync,existsSync} from "node:fs";
import {join} from "node:path";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,it,expect} from "vitest";
import {getCourseBySlug,getAdjacentUnits} from "@/lib/courses";
import {getUnitContent} from "@/lib/services/courses/get-unit-content";
import {reviewBlockers,type ReviewRound} from "@/lib/course-review";
import {CoursePackageNotice} from "@/components/course/CoursePackageNotice";
import priorIdentities from "./fixtures/pre-tiger-course-identities.json";
import PublicCourses from "../app/courses/page";
const tiger=getCourseBySlug("tiger-kidnapping-telecommunications")!;
describe("Tiger Kidnapping course registration and delivery",()=>{
 it("keeps the company course out of the public legacy catalogue",()=>{expect(tiger.catalogueVisibility).toBe("client_specific");expect(renderToStaticMarkup(<PublicCourses/>)).not.toContain(tiger.title);});
 it("registers eight distinct ordered SCORM units without duplicate platform quizzes",()=>{
  expect(tiger.units.map(u=>u.order)).toEqual([1,2,3,4,5,6,7,8]);expect(new Set(tiger.units.map(u=>u.id)).size).toBe(8);
  for(const unit of tiger.units){expect(unit.scormPath).toBeTruthy();expect(unit.quiz).toEqual([]);const content=getUnitContent(tiger.slug,unit.slug)!;expect(content.unit.id).toBe(unit.id);expect(existsSync(join(process.cwd(),"public",decodeURIComponent(unit.scormPath!)))).toBe(true);}
  expect(getAdjacentUnits(tiger.units[2],tiger)).toMatchObject({previous:{slug:"lu2"},next:{slug:"lu4"}});
 });
 it("resolves every SCORM manifest resource and uses SCORM 2004",()=>{
  for(const unit of tiger.units){const root=join(process.cwd(),"public",decodeURIComponent(unit.assetBase));const manifest=readFileSync(join(root,"imsmanifest.xml"),"utf8");expect(manifest).toContain("2004 4th Edition");for(const match of manifest.matchAll(/<file href="([^"]+)"/g))expect(existsSync(join(root,match[1]))).toBe(true);}
 });
 it("leaves the two existing course identities unchanged",()=>{
  for(const [slug,hash] of Object.entries(priorIdentities))expect(createHash("sha256").update(JSON.stringify(getCourseBySlug(slug))).digest("hex")).toBe(hash);
 });
 it("does not treat an unresolved wrong-unit upload as publication-ready",()=>{
  const html=renderToStaticMarkup(<CoursePackageNotice course={tiger}/>);expect(html).toContain("package corrections required");expect(html).toContain("LU5");
  const round={course_id:tiger.id,fingerprint:"hash",status:"open",document:{participants:[],findings:[],reports:[],units:[],brand:{revision:1},terms:{partner:false}}} as unknown as ReviewRound;
  expect(reviewBlockers(round,"hash")).toEqual(expect.arrayContaining(tiger.publicationIssues!));
 });
});
