import {readFileSync,existsSync,readdirSync} from "node:fs";
import {join,resolve,relative} from "node:path";
import {inflateSync} from "node:zlib";
import {describe,expect,it} from "vitest";
import {getUnitContent} from "@/lib/services/courses/get-unit-content";

const root=resolve("public/courses/vpshr-level-0/LU5 Factors-contributing");
const entry=readFileSync(join(root,"res/index.html"),"utf8");
const encoded=entry.match(/var presInfo = "([^"]+)"/)?.[1];
const presentation=JSON.parse(inflateSync(Buffer.from(encoded!,"base64")).toString("utf8"));

describe("republished Factors Contributing SCORM package",()=>{
 it("launches the SCORM 2004 resource with every declared asset present",()=>{
  const content=getUnitContent("vpshr-level-0","lu5")!;
  expect(content.embeddedContentHref).toBe("/courses/vpshr-level-0/LU5 Factors-contributing/res/index.html");
  expect(content.originalContentHref).toBe(content.embeddedContentHref);
  const manifest=readFileSync(join(root,"imsmanifest.xml"),"utf8");
  expect(manifest).toContain("2004 4th Edition");
  expect(manifest).toContain('href="res/index.html"');
  const files=[...manifest.matchAll(/<file\s+href="([^"]+)"/g)].map(m=>m[1]);
  expect(files).toHaveLength(343);
  for(const file of files){expect(relative(root,resolve(root,file)).startsWith("..")).toBe(false);expect(existsSync(join(root,file)),file).toBe(true);}
  for(const media of content.unit.media){if(media.src)expect(existsSync(join("public",media.src)),media.src).toBe(true);if("poster" in media&&media.poster)expect(existsSync(join("public",media.poster)),media.poster).toBe(true);}
  expect(entry).toContain('iSpring.LMS.create("ISPRING_LMS_ID", "2004"');
  expect(content.unit.quiz).toHaveLength(0);
 });
 it("retains all presentation slides, videos, interactions and embedded quizzes",()=>{
  expect(presentation.s).toHaveLength(20);
  const files=readdirSync(join(root,"res/data"));
  expect(files.filter(file=>/^video\d+\.mp4$/.test(file))).toHaveLength(7);
  expect(files.filter(file=>/^intr\d+\.js$/.test(file))).toHaveLength(5);
  expect(files.filter(file=>/^quiz\d+\.js$/.test(file))).toHaveLength(4);
  const videoSlides=presentation.s.filter((slide:{V?:unknown[]})=>slide.V?.length);
  expect(videoSlides).toHaveLength(7);
  for(const slide of videoSlides){
   const timeline=slide.e.reduce((total:number,event:{p:number;a:number})=>total+event.p+event.a,0);
   for(const video of slide.V)expect(timeline).toBeGreaterThanOrEqual(video.d);
  }
  for(const file of files.filter(file=>/^video\d+\.mp4$/.test(file))){
   const bytes=readFileSync(join(root,"res/data",file));
   expect(bytes.length).toBeGreaterThan(1_000_000);
   expect(bytes.subarray(0,200).toString()).not.toContain("https://git-lfs.github.com/spec/v1");
   expect(bytes.subarray(4,8).toString()).toBe("ftyp");
  }
 });
 it("preserves root and previous launch links without nesting another player",()=>{
  for(const [file,target] of [["index.html","res/index.html"],["5. Basic human rights-final (Published)/6. Factors that may contribute-final (Published)/index.html","../../res/index.html"]]){
   const legacy=readFileSync(join(root,file),"utf8");
   expect(legacy).toContain(`content="0;url=${target}"`);
   expect(legacy).not.toContain("<iframe");
  }
 });
});
