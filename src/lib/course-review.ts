export type ReviewPerson = { email: string; role: "primary" | "peer"; state: "invited" | "active" | "finished" | "declined"; userId?: string; reason?: string; coverage: string[] };
export type ReviewReport = { id: string; email: string; userId: string; at: string; text: string; coverage: string[]; endorsements: { email: string; userId: string; at: string; decision: "approve" | "changes"; text: string }[] };
export type ReviewFinding = { id: string; unit: string; reference: string; category: string; blocking: boolean; author: string; userId: string; at: string; text: string; attachment?: string; status: "open" | "fixed" | "closed"; fixedBy?: string; replies: { email: string; userId: string; at: string; text: string }[] };
export type ReviewDocument = {
  title: string; brand: { name: string; revision: number; color: string; logo: string | null }; requester: string; requesterId: string;
  cutoff: string; units: { slug: string; title: string }[]; participants: ReviewPerson[]; reports: ReviewReport[]; findings: ReviewFinding[];
  events: { actor: string; at: string; action: string; detail: string }[];
  terms: { text: string; partner: boolean; acceptor: string; decision?: "accepted" | "rejected"; at?: string; userId?: string; reason?: string };
};
export type ReviewRound = { id: string; plan_id: string; organisation_id: string; course_id: string; fingerprint: string; revision: number; status: "open" | "cancelled" | "published"; created_at: string; document: ReviewDocument };
export const normalizedEmail = (value: string) => value.trim().toLowerCase();
export function reviewPeople(emails: string[], roles: string[], requester: string): ReviewPerson[] {
  const clean = emails.map(normalizedEmail);
  if (clean.length < 2 || clean.some(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 254) || new Set(clean).size !== clean.length)
    throw Error("Include at least two different valid reviewer email addresses.");
  const people = clean.map((email, i) => ({ email, role: roles[i] === "peer" ? "peer" as const : "primary" as const, state: "invited" as const, coverage: [] }));
  if (!people.some(p => p.email === normalizedEmail(requester) && p.role === "primary") || people.filter(p => p.role === "primary").length < 2)
    throw Error("Include yourself and at least one other full reviewer. Peer-only checkers are optional.");
  return people;
}
export function currentReport(doc: ReviewDocument, email: string) { return doc.reports.filter(r => r.email === email).at(-1); }
export function reviewBlockers(round: ReviewRound, currentFingerprint: string) {
  const d = round.document, reasons: string[] = [];
  if (round.status !== "open") reasons.push("This round is no longer open.");
  if (round.fingerprint !== currentFingerprint) reasons.push("Content, brand or commercial version changed. Start a new review round.");
  const primaries = d.participants.filter(p => p.role === "primary" && p.state !== "declined");
  if (primaries.length < 2) reasons.push("At least two full reviewers are required.");
  if (new Set(primaries.map(p=>p.userId).filter(Boolean)).size !== primaries.length) reasons.push("Each full reviewer must finish using a distinct verified account.");
  if (d.participants.some(p => p.state === "declined")) reasons.push("A decline needs requester acknowledgement or replacement.");
  for (const p of primaries) {
    const report = currentReport(d, p.email);
    if (!report || p.state !== "finished" || !d.units.every(u => report.coverage.includes(u.slug))) reasons.push(`${p.email}: full review and unit/quiz coverage outstanding.`);
    else if (!report.endorsements.some(e => e.decision === "approve" && e.userId !== report.userId && e.email !== p.email && d.participants.some(person => person.email === e.email && person.state !== "declined"))) reasons.push(`${p.email}: independent report endorsement outstanding.`);
    if (report?.endorsements.some(e => e.decision === "changes")) reasons.push(`${p.email}: a peer requested changes; submit a revised report.`);
  }
  if (d.findings.some(f => f.blocking && f.status !== "closed")) reasons.push("Publication-blocking findings remain unresolved.");
  if (d.terms.partner && d.terms.decision !== "accepted") reasons.push("The authorised company owner must accept this exact commercial schedule.");
  return reasons;
}
export function canWork(round: ReviewRound, now = Date.now()) { return round.status === "open" && now < Date.parse(round.document.cutoff); }
export function needsReminder(round: ReviewRound, person: ReviewPerson, now = Date.now()) {
  return canWork(round, now) && person.state !== "finished" && person.state !== "declined";
}
export function progressText(round: ReviewRound) {
  const d = round.document;
  return `${d.title}\nCutoff: ${new Date(d.cutoff).toLocaleString("en-ZA", {timeZone:"Africa/Johannesburg"})} Africa/Johannesburg\n${d.participants.map(p => `${p.email}: ${p.role}, ${p.state}${p.state !== "finished" && p.state !== "declined" && !canWork(round) ? " (overdue — extension required)" : ""}`).join("\n")}\nReports submitted: ${d.reports.length}\nOpen blocking findings: ${d.findings.filter(f=>f.blocking&&f.status!=="closed").length}`;
}
