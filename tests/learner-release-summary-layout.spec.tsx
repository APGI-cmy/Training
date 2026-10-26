import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import {SummaryFacts,SummaryText} from "@/components/shared/SummaryText";
import {commercialSummarySections,feedbackSummarySections,summaryItems} from "@/lib/summary-sections";
import {commercialConditionsSummary,courseOwnershipSummary} from "@/lib/commercial-planning";

const recorded = [
  "Client: Recorded course. Current declared owner: APGI.",
  "Planning minimum learner price USD 277.18; minimum ongoing combined APGI income USD 50.00, excluding development recovery.",
  "Running costs are provided first, plus 6% administration on eligible costs only. A separate 10.00% operating-cost contingency of USD 2.35 is reserved; it is not an incurred expense and attracts no administration fee.",
  "The split after operating costs, before development recovery is 20.00% APGI and 80.00% partner. Development recovery is 25% of the partner's share after APGI's ongoing platform share has been set aside. Outstanding recovery: USD 3000.00.",
  "This working draft does not approve rights, transfer ownership, publish a course or activate payment terms.",
  "Course design credit: Johan Ras, APGI. Design credit is recorded separately from legal ownership and does not itself transfer rights.",
  "Sharing model: Course owner / partner — standard model.",
  "APGI owns the course until the full approved development price of USD 3000.00 has been recovered. USD 0.00 has already been paid or recovered. Once the full price is recovered, ownership passes to the client.",
  "This draft records the proposed conditions; saving it does not activate or execute an ownership transfer.",
].join(" ");
const normalize=(text:string)=>text.replace(/\s+/g," ").trim();

describe("Readable saved summaries",()=>{
  it("groups an earlier one-paragraph commercial record without losing or reordering any terms",()=>{
    const sections=commercialSummarySections(recorded);
    expect(sections.map(s=>s.title)).toEqual(["Course and current owner","Pricing and ongoing APGI income","Operating costs and contingency","Revenue sharing and development recovery","Draft status and approvals","Course design credit","Sharing model","Course ownership and transfer","Saving and ownership transfer"]);
    expect(normalize(sections.flatMap(s=>s.items).join(" "))).toBe(normalize(recorded));
    expect(sections.find(s=>s.title==="Revenue sharing and development recovery")?.items.join(" ")).toContain("25% of the partner's share");
  });
  it("keeps decimals, contact addresses, initials and reference links intact",()=>{
    const text="USD 277.18 is the minimum. Ask J. Ras at person@example.com. Open https://example.com/review/1. Recovery stops at USD 0.00.";
    expect(normalize(summaryItems(text).join(" "))).toBe(text);
    expect(summaryItems(text)).toContain("USD 277.18 is the minimum.");
    expect(summaryItems(text).join(" ")).toContain("person@example.com");
  });
  it("displays headings and real lists rather than a scrolling preformatted paragraph",()=>{
    const html=renderToStaticMarkup(<SummaryText commercial text={recorded}/>);
    expect(html).toContain("<h4>Operating costs and contingency</h4>");
    expect(html).toContain("<ul><li>");
    expect(html).toContain("USD 3000.00");
    expect(html).not.toContain("<pre");
    expect(html).not.toContain("review-report");
  });
  it.each(["apgi_permanent","apgi_until_recovered","partner_paid"])("preserves recorded ownership wording for %s",ownership_model=>{
    const config={ownership_model,client_owner_name:"Example client",currency:"USD",development_cost:"3000.00",already_paid:"0.00",recovery_rate:"25",sharing_model:"tailored",tailored_reason:"Recorded exception. Keep this exact explanation."};
    const text=commercialConditionsSummary(config);
    expect(normalize(commercialSummarySections(text).flatMap(s=>s.items).join(" "))).toBe(normalize(text));
    expect(commercialSummarySections(courseOwnershipSummary(config))[0].title).toBe("Course ownership and transfer");
  });
  it("retains unfamiliar legacy wording instead of inventing replacement terms",()=>{
    const text="Earlier agreed schedule; internal reference ABC. Special condition remains recorded here.";
    expect(commercialSummarySections(text)).toEqual([{title:"Recorded terms",items:["Earlier agreed schedule; internal reference ABC.","Special condition remains recorded here."]}]);
  });
  it("formats report headings, multiline findings and existing bullets consistently",()=>{
    const sections=feedbackSummarySections("Review completed.\n\nReviewer explanation:\nKeep the video. Add captions.\n\nFindings at submission:\n- Slide 2 needs captions\n• Slide 3 needs captions");
    expect(sections.map(s=>s.title)).toEqual(["","Reviewer explanation","Findings at submission"]);
    expect(sections[1].items).toEqual(["Keep the video.","Add captions."]);
    expect(sections[2].items).toEqual(["Slide 2 needs captions","Slide 3 needs captions"]);
  });
  it("escapes authored content and handles empty feedback without adding a decision",()=>{
    const html=renderToStaticMarkup(<SummaryText text={'<script>alert("x")</script>\nReviewer comments:\nNo conclusion recorded.'}/>);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("<h4>Reviewer comments</h4>");
    expect(renderToStaticMarkup(<SummaryText text=" "/>)).toBe("");
  });
  it("shows prices, decision status and the full reference as distinct labelled facts",()=>{
    const html=renderToStaticMarkup(<SummaryFacts entries={[["Minimum learner fee","USD 277.18"],["Decision","Awaiting decision"],["Commercial version reference","6a43a446-5797-4177-af5e-22a4ac60c655"]]}/>);
    expect(html).toContain("<dt>Decision</dt><dd>Awaiting decision</dd>");
    expect(html).toContain("6a43a446-5797-4177-af5e-22a4ac60c655");
  });
});
