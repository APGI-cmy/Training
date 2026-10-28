import {createHash} from "node:crypto";
import {existsSync,readFileSync} from "node:fs";
import {join,resolve,relative} from "node:path";
import {inflateSync} from "node:zlib";
import {describe,expect,it} from "vitest";
import {getUnitContent} from "@/lib/services/courses/get-unit-content";

const root=resolve("public/courses/vpshr-level-0/LU1 Definition");
const entry=readFileSync(join(root,"res/index.html"),"utf8");
const encoded=entry.match(/var presInfo = "([^"]+)"/)?.[1];
const presentation=JSON.parse(inflateSync(Buffer.from(encoded!,"base64")).toString("utf8"));

describe("republished LU1 Definition of Human Rights",()=>{
 it("launches the SCORM resource with every declared asset and catalogue reference present",()=>{
  const content=getUnitContent("vpshr-level-0","lu1")!;
  expect(content.embeddedContentHref).toBe("/courses/vpshr-level-0/LU1 Definition/res/index.html");
  expect(content.originalContentHref).toBe(content.embeddedContentHref);
  const manifest=readFileSync(join(root,"imsmanifest.xml"),"utf8");
  expect(manifest).toContain("2004 4th Edition");
  expect(manifest).toContain('href="res/index.html"');
  const assets=[...manifest.matchAll(/<file\s+href="([^"]+)"/g)].map(m=>m[1]);
  expect(assets).toHaveLength(137);
  for(const asset of assets){expect(relative(root,resolve(root,asset)).startsWith("..")).toBe(false);expect(existsSync(join(root,asset)),asset).toBe(true);}
  for(const media of content.unit.media){if(media.src)expect(existsSync(join("public",media.src)),media.src).toBe(true);if("poster" in media&&media.poster)expect(existsSync(join("public",media.poster)),media.poster).toBe(true);}
  for(const slide of content.unit.slides){if(slide.thumbnail)expect(existsSync(join("public",slide.thumbnail)),slide.thumbnail).toBe(true);}
  expect(entry).toContain('iSpring.LMS.create("ISPRING_LMS_ID", "2004"');
  expect(content.unit.quiz).toHaveLength(0);
 });
 it("keeps the author's five slides, two embedded quizzes and interaction",()=>{
  expect(presentation.s).toHaveLength(5);
  for(const file of ["quiz1.js","quiz2.js","intr1.js"])expect(readFileSync(join(root,"res/data",file)).length).toBeGreaterThan(30_000);
 });
 it("delivers the approved captioned introduction as real MP4 bytes",()=>{
  const expected="a9c3e741750ce0093990295a02e1d61af9a54dabf7ce0524e8e5d55aa0ebc8d5";
  for(const file of ["video1.mp4","video2.mp4"]){
   const bytes=readFileSync(join(root,"res/data",file));
   expect(bytes.subarray(4,8).toString()).toBe("ftyp");
   expect(createHash("sha256").update(bytes).digest("hex")).toBe(expected);
  }
  expect(presentation.s[0].V[0].d).toBeGreaterThan(65);
  expect(presentation.s[0].V[0].h).toContain("Click Next");
 });
 it("preserves the former launch URL and its review query parameters",()=>{
  const redirect=readFileSync(join(root,"index.html"),"utf8");
  expect(redirect).toContain('content="0;url=res/index.html"');
  expect(redirect).toContain('location.search+location.hash');
  expect(redirect).not.toContain("<iframe");
 });
});
