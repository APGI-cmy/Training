import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,it,expect,vi} from "vitest";
vi.mock("@/components/reviews/ReviewForms",()=>({ReviewForm:({children}:{children:React.ReactNode})=><form>{children}</form>}));
import {FindingUpdateForm} from "@/components/reviews/FindingUpdateForm";
import {declarationChoices,requestedChangeStatement} from "@/lib/review-declarations";

describe("Clear, compatible review declarations",()=>{
 it("allows only the requested combinations of the three choices",()=>{
  for(const lu of [false,true])for(const quiz of [false,true])for(const issue of [false,true]){
   const parts=([...(lu?["lu"]:[]),...(quiz?["quiz"]:[])] as ("lu"|"quiz")[]);
   expect(declarationChoices(parts,issue,false).conflict).toBe(lu&&quiz&&issue);
  }
 });
 it("disables the unselected third choice, while keeping selected choices removable",()=>{
  expect(declarationChoices(["lu","quiz"],false,false).issueDisabled).toBe(true);
  const slides=declarationChoices(["lu"],true,false);
  expect(slides.partDisabled("quiz")).toBe(true);expect(slides.partDisabled("lu")).toBe(false);
  const quiz=declarationChoices(["quiz"],true,false);
  expect(quiz.partDisabled("lu")).toBe(true);expect(quiz.partDisabled("quiz")).toBe(false);
  expect(declarationChoices([],true,false).partDisabled("lu")).toBe(false);
 });
 it("keeps e-book findings possible when slides and quiz are satisfactory",()=>{
  expect(declarationChoices(["lu","quiz"],true,true).conflict).toBe(false);
  expect(declarationChoices(["lu","quiz"],true,true).partDisabled("ebook")).toBe(true);
  expect(requestedChangeStatement(["lu","quiz"],true)).toContain("the e-book");
 });
 it("offers only the permitted status actions with optional explanation",()=>{
  const html=renderToStaticMarkup(<FindingUpdateForm id="r" findingId="f" canFix canVerify={false}/>);
  expect(html).toContain("Discussion only — leave status unchanged");expect(html).toContain("Changes implemented — request independent verification");
  expect(html).not.toContain('value="close"');expect(html).toContain("Explanation (optional)");expect(html).not.toContain("required");
 });
});
