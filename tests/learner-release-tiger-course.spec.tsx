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
 it("leaves Scannex unchanged; VPSHR's separately requested quiz removal is tested in its own release checks",()=>{
  const slug="scannex-training-programme";
  expect(createHash("sha256").update(JSON.stringify(getCourseBySlug(slug))).digest("hex")).toBe(priorIdentities[slug]);
 });
 it("uses the restored LU5 while keeping review and publication approval gates",()=>{
  expect(tiger.publicationIssues).toEqual([]);
  expect(tiger.units[4].title).toBe("Personal and Family Readiness");
  const lu5=join(process.cwd(),"public",decodeURIComponent(tiger.units[4].assetBase));
  expect(readFileSync(join(lu5,"imsmanifest.xml"),"utf8")).toContain("Unit 5 - Personal and Family Readiness");
  expect(readFileSync(join(lu5,"res/data/slide1.js"),"utf8")).not.toContain("Unit 4");
  for(let n=1;n<=3;n++)expect(readFileSync(join(lu5,`res/data/wo${n}/index.html`),"utf8")).toContain(`TK-LU05-LA0${n}`);
  expect(renderToStaticMarkup(<CoursePackageNotice course={tiger}/>)).toBe("");
  const round={course_id:tiger.id,fingerprint:"hash",status:"open",document:{participants:[],findings:[],reports:[],units:[],brand:{revision:1},terms:{partner:false}}} as unknown as ReviewRound;
  expect(reviewBlockers(round,"hash").length).toBeGreaterThan(0);
 });
 it("still shows package issues when a course has unresolved upload corrections",()=>{
  const html=renderToStaticMarkup(<CoursePackageNotice course={{...tiger,publicationIssues:["LU5 correction required"]}}/>);
  expect(html).toContain("package corrections required");expect(html).toContain("LU5 correction required");
 });
});
