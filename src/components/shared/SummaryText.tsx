import type { ReactNode } from "react";
import { commercialSummarySections, feedbackSummarySections } from "@/lib/summary-sections";
import "./summary-text.css";

export function SummaryText({ text, commercial = false, headingLevel = 4 }: {
  text?: string | null; commercial?: boolean; headingLevel?: 3 | 4 | 5;
}) {
  if (!text?.trim()) return null;
  const Heading = `h${headingLevel}` as "h3" | "h4" | "h5";
  const sections = commercial ? commercialSummarySections(text) : feedbackSummarySections(text);
  return <div className="summary-text">{sections.map((section, index) => <section key={index}>
    {section.title ? <Heading>{section.title}</Heading> : null}
    {section.items.length === 1 ? <p>{section.items[0]}</p> : section.items.length ? <ul>{section.items.map((item, i) => <li key={i}>{item}</li>)}</ul> : null}
  </section>)}</div>;
}

export function SummaryFacts({ entries }: { entries: readonly (readonly [string, ReactNode])[] }) {
  return <dl className="summary-facts">{entries.map(([label, value]) => <div key={label}>
    <dt>{label}</dt><dd>{value}</dd>
  </div>)}</dl>;
}
