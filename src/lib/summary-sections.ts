export type SummarySection = { title: string; items: string[] };

// Presentation only: always read the recorded text, never recalculate saved terms.
// Sentence segmentation keeps decimals, email addresses and URLs intact.
export function summaryItems(text: string) {
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  return text.split(/\r?\n/).flatMap(line =>
    Array.from(segmenter.segment(line), part => part.segment.trim()).filter(Boolean)
  );
}

const commercialHeadings: [RegExp, string][] = [
  [/^Planning minimum learner price /, "Pricing and ongoing APGI income"],
  [/^Running costs /, "Operating costs and contingency"],
  [/^(The split |Approved split |Split after )/, "Revenue sharing and development recovery"],
  [/^No separate fixed hosting /, "Hosting and price adjustments"],
  [/^This working draft /, "Draft status and approvals"],
  [/^Course design credit:/, "Course design credit"],
  [/^Sharing model:/, "Sharing model"],
  [/^(APGI owns the course |.+ paid the development price in advance and owns the course )/, "Course ownership and transfer"],
  [/^APGI platform identity:/, "APGI / SRMS joint ownership"],
  [/^Ongoing hosting and sales rights:/, "Continuing hosting and sales rights"],
  [/^(Reciprocal sales scope:|Approved reciprocal course list:)/, "Approved reciprocal courses"],
  [/^(Routine course maintenance |Routine maintenance:)/, "Maintenance and future upgrades"],
  [/^Additional sales conditions:/, "Additional sales conditions"],
  [/^This draft records the proposed conditions;/, "Saving and ownership transfer"],
];

export function commercialSummarySections(text: string): SummarySection[] {
  const sections: SummarySection[] = [];
  let title = text.includes("Current declared owner:") ? "Course and current owner" : "Recorded terms";
  for (const item of summaryItems(text)) {
    title = commercialHeadings.find(([pattern]) => pattern.test(item))?.[1] ?? title;
    const previous = sections.at(-1);
    if (previous?.title === title) previous.items.push(item);
    else sections.push({ title, items: [item] });
  }
  return sections;
}

export function feedbackSummarySections(text: string): SummarySection[] {
  const sections: SummarySection[] = [];
  let paragraphEnded = false;
  for (const line of text.split(/\r?\n/).map(line => line.trim())) {
    if (!line) {
      paragraphEnded = !!sections.at(-1)?.items.length;
      continue;
    }
    const heading = /^(Reviewer explanation|Findings at submission|Reviewer comments):$/.exec(line)?.[1]
      ?? /^#{1,6}\s+(.+)$/.exec(line)?.[1];
    if (heading) sections.push({ title: heading, items: [] });
    else {
      if (!sections.length || paragraphEnded) sections.push({ title: "", items: [] });
      // Existing plain-text bullet markers become actual list items.
      sections.at(-1)!.items.push(...summaryItems(line.replace(/^[-*•]\s+/, "")));
    }
    paragraphEnded = false;
  }
  return sections;
}
