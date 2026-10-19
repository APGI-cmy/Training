import {commercialPublicationBlockers,type PublicationWorkflow} from "./publication-workflow";

export type ReviewPerson = { email: string; role: "primary" | "peer" | "partner"; scope?: "content" | "content_and_commercials"; state: "invited" | "active" | "finished" | "declined"; userId?: string; reason?: string; coverage: string[] };

export type ReviewReport = { id: string; email: string; userId: string; at: string; text: string; coverage: string[]; endorsements: { email: string; userId: string; at: string; decision: "approve" | "changes"; text: string }[] };

export type SatisfactoryPart = "lu" | "quiz" | "ebook";
export const satisfactoryLabels:Record<SatisfactoryPart,string> = {lu:"the learning unit / slides",quiz:"the quiz",ebook:"the e-book"};
export function satisfactoryParts(values:string[]):SatisfactoryPart[] {
 if(values.some(v=>!["lu","quiz","ebook"].includes(v)))throw Error("Choose learning unit, quiz or e-book declarations.");
 return (["lu","quiz","ebook"] as const).filter(v=>values.includes(v));
}
export function satisfactionStatement(parts:SatisfactoryPart[]) {
 return parts.length?`I am happy with ${parts.map(p=>satisfactoryLabels[p]).join(" and ")}.`:"I am happy with this slide, learning unit, quiz or e-book.";
}
export const declarationReference = (parts:SatisfactoryPart[]) => parts.map(p=>({lu:"Entire LU",quiz:"Quiz",ebook:"E-book"}[p])).join(" + ");
export type ReviewFinding = { id: string; unit: string; reference: string; category: string; categories?: string[]; satisfiedParts?: SatisfactoryPart[]; outcome?: "issue" | "satisfied"; supersededBy?: string; blocking: boolean; author: string; userId: string; at: string; text: string; attachment?: string; status: "open" | "fixed" | "closed"; fixedBy?: string; replies: { email: string; userId: string; at: string; text: string }[] };

export const activeFindings = (doc: ReviewDocument) => doc.findings.filter(f => !f.supersededBy);

export function findingCategories(values: string[]) {
 const categories = [...new Set(values.map(v => v.trim()).filter(Boolean))];
 if (!categories.length || categories.length > 10 || categories.some(c => c.length > 80)) throw Error("Choose between one and ten categories, each up to 80 characters.");
 return categories;
}

// New versions preserve the original finding, replies and screenshot in the audit trail.
export function recordFinding(doc: ReviewDocument, finding: ReviewFinding, replaceId = "") {
 const previous = activeFindings(doc).find(f => f.author === finding.author && f.unit === finding.unit && f.reference.toLowerCase() === finding.reference.toLowerCase());
 if (previous && replaceId !== previous.id) throw Error("You already reviewed this reference. Confirm replacement, or use a different slide/question reference.");
 if (replaceId && previous?.id !== replaceId) throw Error("This finding changed. Reload before replacing it.");
 if (previous?.blocking && previous.status !== "closed") throw Error("An unresolved blocking finding must be fixed and independently verified before replacement. Use its discussion to add details.");
 if (previous) previous.supersededBy = finding.id;
 doc.findings.push(finding);
}

export type ReviewDocument = {

  workflow?: PublicationWorkflow;

  title: string; brand: { name: string; revision: number; color: string; logo: string | null }; requester: string; requesterId: string;

  cutoff: string; units: { slug: string; title: string }[]; participants: ReviewPerson[]; reports: ReviewReport[]; findings: ReviewFinding[];

  events: { actor: string; at: string; action: string; detail: string }[];

  terms: { text: string; partner: boolean; acceptor: string; decision?: "accepted" | "rejected"; at?: string; userId?: string; reason?: string };

};

export type ReviewRound = { id: string; plan_id: string | null; organisation_id: string; course_id: string; fingerprint: string; revision: number; status: "open" | "cancelled" | "published"; created_at: string; document: ReviewDocument };

export const normalizedEmail = (value: string) => value.trim().toLowerCase();

export function reviewPeople(emails: string[], roles: string[], requester: string, scopes: string[] = []): ReviewPerson[] {

  const clean = emails.map(normalizedEmail);

  if (clean.length < 2 || clean.some(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 254) || new Set(clean).size !== clean.length)

    throw Error("Include at least two different valid reviewer email addresses.");

  const people = clean.map((email, i) => ({ email, role: roles[i] === "peer" ? "peer" as const : "primary" as const, scope: scopes[i] === "content_and_commercials" ? "content_and_commercials" as const : "content" as const, state: "invited" as const, coverage: [] }));

  if (!people.some(p => p.email === normalizedEmail(requester) && p.role === "primary") || people.filter(p => p.role === "primary").length < 2)

    throw Error("Include yourself and at least one other full reviewer. Peer-only checkers are optional.");

  return people;

}

export function currentReport(doc: ReviewDocument, email: string) { return doc.reports.filter(r => r.email === email).at(-1); }

export function contentReviewBlockers(round: ReviewRound, currentFingerprint: string) {

  const d = round.document, reasons: string[] = [];

  if (round.status !== "open") reasons.push("This round is no longer open.");

  if (round.fingerprint !== currentFingerprint) reasons.push("Course content changed. Start a new content review.");

  const primaries = d.participants.filter(p => p.role === "primary" && p.state !== "declined");

  if (primaries.length < 2) reasons.push("At least two full reviewers are required.");

  if (new Set(primaries.map(p=>p.userId).filter(Boolean)).size !== primaries.length) reasons.push("Each full reviewer must finish using a distinct verified account.");

  if (d.participants.some(p => p.state === "declined")) reasons.push("A decline needs requester acknowledgement or replacement.");

  for (const p of primaries) {

    const report = currentReport(d, p.email);

    const coverage = p.state === "finished" && report ? report.coverage : p.coverage;
    const missing = d.units.filter(u => !coverage.includes(u.slug));
    if (missing.length) reasons.push(`${p.email}: ${missing.length} LU/quiz coverage confirmations outstanding.`);
    if (!report || p.state !== "finished") reasons.push(`${p.email}: submit your completed full review report.`);
    else if (!report.endorsements.some(e => e.decision === "approve" && e.userId !== report.userId && e.email !== p.email && d.participants.some(person => person.email === e.email && person.state !== "declined"))) reasons.push(`${p.email}: independent report endorsement outstanding.`);

    if (report?.endorsements.some(e => e.decision === "changes")) reasons.push(`${p.email}: a peer requested changes; submit a revised report.`);

  }

  if (activeFindings(d).some(f => f.blocking && f.status !== "closed")) reasons.push("Publication-blocking findings remain unresolved.");



  return reasons;

}

export function reviewBlockers(round:ReviewRound,hash:string,brandRevision=round.document.brand.revision){

 const reasons=contentReviewBlockers(round,hash);const w=round.document.workflow;

 if(w)reasons.push(...commercialPublicationBlockers(w,hash,brandRevision));

 else if(round.document.terms.partner&&round.document.terms.decision!=="accepted")reasons.push("The authorised company owner must accept this exact commercial schedule.");

 return reasons;

}

export function canWork(round: ReviewRound, now = Date.now()) { return round.status === "open" && (!round.document.workflow||round.document.workflow.stage==="content_review") && now < Date.parse(round.document.cutoff); }

export function needsReminder(round: ReviewRound, person: ReviewPerson, now = Date.now()) {

  return canWork(round, now) && person.state !== "finished" && person.state !== "declined";

}

export function progressText(round: ReviewRound) {

  const d = round.document;

  return `${d.title}\nCutoff: ${new Date(d.cutoff).toLocaleString("en-ZA", {timeZone:"Africa/Johannesburg"})} Africa/Johannesburg\n${d.participants.map(p => `${p.email}: ${p.role}, ${p.state}${p.state !== "finished" && p.state !== "declined" && (!d.workflow||d.workflow.stage==="content_review") && !canWork(round) ? " (overdue — extension required)" : ""}`).join("\n")}\nReports submitted: ${d.reports.length}\nOpen blocking findings: ${d.findings.filter(f=>f.blocking&&f.status!=="closed").length}`;

}

