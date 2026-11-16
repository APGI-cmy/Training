import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
const effects=vi.hoisted(()=>[] as Array<()=>void|(()=>void)>);
vi.mock("react",async load=>({...await load<typeof import("react")>(),useEffect:(effect:()=>void|(()=>void))=>{effects.push(effect);}}));
import {ScormPlayer} from "@/components/course/ScormPlayer";
import {readPreviewProgress} from "@/components/course/PreviewProgress";

beforeEach(()=>{
 effects.length=0;const values=new Map<string,string>();
 vi.stubGlobal("sessionStorage",{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)});
 vi.stubGlobal("window",Object.assign(new EventTarget(),{API_1484_11:undefined}));
});
afterEach(()=>vi.unstubAllGlobals());
function install(unit="lu5",scope="account:review:version"){
 effects.length=0;renderToStaticMarkup(<ScormPlayer courseSlug="tiger-kidnapping-telecommunications" unitSlug={unit} unitId={unit} previewScope={scope} title="Test unit" launchSrc="/package/index.html" mode="preview"/>);
 const cleanup=effects[0]() as ()=>void;
 return {api:window.API_1484_11 as Record<string,(...args:string[])=>string>,cleanup};
}
describe("Preview SCORM isolation and learner-compatible API",()=>{
 it("accepts quiz commits and resumes locally without reading or writing the learner API",()=>{
  const network=vi.spyOn(globalThis,"fetch"),first=install();
  expect(first.api.Initialize("")).toBe("true");expect(first.api.GetValue("cmi.mode")).toBe("normal");
  first.api.SetValue("cmi.suspend_data","saved-slide-and-quiz");first.api.SetValue("cmi.location","4");first.api.SetValue("cmi.completion_status","completed");first.api.SetValue("cmi.success_status","passed");first.api.Commit("");first.cleanup();
  const resumed=install();expect(resumed.api.GetValue("cmi.entry")).toBe("resume");expect(resumed.api.GetValue("cmi.location")).toBe("4");expect(readPreviewProgress("account:review:version").completed).toEqual(["lu5"]);resumed.cleanup();
  expect(network).not.toHaveBeenCalled();network.mockRestore();
 });
 it("starts the next unit cleanly and cannot resume another account or review version",()=>{
  const first=install();first.api.Initialize("");first.api.SetValue("cmi.suspend_data","unit-5-data");first.api.SetValue("cmi.location","4");first.cleanup();
  for(const [unit,scope] of [["lu6","account:review:version"],["lu5","other:review:version"],["lu5","account:review:new-version"]]){
   const next=install(unit,scope);expect(next.api.GetValue("cmi.entry")).toBe("ab-initio");expect(next.api.GetValue("cmi.location")).toBe("");expect(next.api.GetValue("cmi.suspend_data")).toBe("");next.cleanup();
  }
 });
});
