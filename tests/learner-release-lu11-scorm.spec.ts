import {readFileSync,existsSync} from "node:fs";
import {join,resolve} from "node:path";
import {inflateSync} from "node:zlib";
import {describe,expect,it} from "vitest";
import {getUnitContent} from "@/lib/services/courses/get-unit-content";

const root=resolve("public/courses/vpshr-level-0/LU11 Civil-unrest");
const entry=readFileSync(join(root,"res/index.html"),"utf8");
const encoded=entry.match(/var presInfo = "([^"]+)"/)?.[1];
const presentation=JSON.parse(inflateSync(Buffer.from(encoded!,"base64")).toString("utf8"));

describe("republished Civil Unrest SCORM package",()=>{
 it("launches the SCORM 2004 resource and includes every declared manifest file",()=>{
  const content=getUnitContent("vpshr-level-0","lu11")!;
  expect(content.embeddedContentHref).toBe("/courses/vpshr-level-0/LU11 Civil-unrest/res/index.html");
  expect(content.originalContentHref).toBe(content.embeddedContentHref);
  const manifest=readFileSync(join(root,"imsmanifest.xml"),"utf8");
  expect(manifest).toContain("2004 4th Edition");
  expect(manifest).toContain('href="res/index.html"');
  const files=[...manifest.matchAll(/<file\s+href="([^"]+)"/g)].map(m=>m[1]);
  expect(files.length).toBeGreaterThan(70);
  for(const file of files){expect(resolve(root,file).startsWith(root+"\\")||resolve(root,file).startsWith(root+"/")).toBe(true);expect(existsSync(join(root,file)),file).toBe(true);}
  for(const media of content.unit.media){if(media.src)expect(existsSync(join("public",media.src)),media.src).toBe(true);if("poster" in media&&media.poster)expect(existsSync(join("public",media.poster)),media.poster).toBe(true);}
  expect(entry).toContain('iSpring.LMS.create("ISPRING_LMS_ID", "2004"');
 });
 it("keeps the nine-minute video timeline instead of the obsolete one-minute cutoff",()=>{
  const slide=presentation.s[0];
  expect(slide.V[0].d).toBeGreaterThan(545);
  const timeline=slide.e.reduce((total:number,event:{p:number;a:number})=>total+event.p+event.a,0);
  expect(timeline).toBeGreaterThanOrEqual(slide.V[0].d);
  expect(timeline).toBeLessThan(550);
  expect(presentation.s).toHaveLength(3);
  expect(existsSync(join(root,"res/data/quiz1.js"))).toBe(true);
 });
 it("keeps existing launch links working without introducing another iframe",()=>{
  const legacy=readFileSync(join(root,"index.html"),"utf8");
  expect(legacy).toContain('content="0;url=res/index.html"');
  expect(legacy).not.toContain("<iframe");
 });
});
