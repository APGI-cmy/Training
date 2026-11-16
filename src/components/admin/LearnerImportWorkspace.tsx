"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { createBatchInvitations } from "@/server/actions/invitations/create-batch-invitations";
import type { InvitationInput } from "@/server/actions/invitations/create-invitation";

type ImportSummary = {
  fileName: string;
  format: "CSV" | "Excel workbook";
  rows: number;
  valid: number;
  invalid: number;
  missingRequiredReportingHeaders: string[];
  message: string;
};

type ZipEntry = { name: string; compression: number; compressedSize: number; offset: number };
type ImportRow = InvitationInput & { rowNumber: number };

const template = [
  "email,first_name,last_name,national_identity_number,company,country,operation_subdivision,department_team,organisation_slug,course_slug,access_basis,reason,expires_at,role,group_name",
  "learner@example.invalid,Ada,Lovelace,ID-EXAMPLE-001,Example Company,South Africa,,,apgi,scannex-training-programme,corporate_order,Training allocation,2026-12-31T23:59,learner,"
].join("\n");

const requiredReportingHeaders = ["company", "country", "organisation_slug"];
const optionalReportingHeaders = ["operation_subdivision", "department_team"];

function normaliseHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function parseDelimited(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1; } else quoted = !quoted;
    } else if (!quoted && character === delimiter) {
      row.push(value.trim()); value = "";
    } else if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some((cell) => cell)) rows.push(row);
      row = []; value = "";
    } else value += character;
  }
  row.push(value.trim());
  if (row.some((cell) => cell)) rows.push(row);
  return rows;
}

function parseTextRows(text: string) {
  const csvRows = parseDelimited(text.replace(/^\uFEFF/, ""), ",");
  const tsvRows = parseDelimited(text.replace(/^\uFEFF/, ""), "\t");
  return tsvRows[0]?.length > csvRows[0]?.length ? tsvRows : csvRows;
}

function columnIndex(reference: string) {
  return reference.replace(/\d/g, "").split("").reduce((total, character) => total * 26 + character.charCodeAt(0) - 64, 0) - 1;
}

function findEndOfCentralDirectory(bytes: Uint8Array) {
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65_557); offset -= 1) {
    if (new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true) === 0x06054b50) return offset;
  }
  throw new Error("The workbook is not a valid .xlsx file.");
}

async function unzipWorkbook(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const end = findEndOfCentralDirectory(bytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = new Map<string, ZipEntry>();
  const entryCount = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("The workbook directory is unreadable.");
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const entry: ZipEntry = {
      name: decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength)),
      compression: view.getUint16(offset + 10, true),
      compressedSize: view.getUint32(offset + 20, true),
      offset: view.getUint32(offset + 42, true)
    };
    entries.set(entry.name, entry);
    offset += 46 + nameLength + extraLength + commentLength;
  }

  async function readEntry(name: string) {
    const entry = entries.get(name);
    if (!entry) return null;
    if (view.getUint32(entry.offset, true) !== 0x04034b50) throw new Error("The workbook contains an unreadable file.");
    const nameLength = view.getUint16(entry.offset + 26, true);
    const extraLength = view.getUint16(entry.offset + 28, true);
    const data = bytes.slice(entry.offset + 30 + nameLength + extraLength, entry.offset + 30 + nameLength + extraLength + entry.compressedSize);
    if (entry.compression === 0) return decoder.decode(data);
    if (entry.compression !== 8 || typeof DecompressionStream === "undefined") throw new Error("This browser cannot read this Excel workbook. Save it as CSV and try again.");
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new TextDecoder().decode(await new Response(stream).arrayBuffer());
  }

  return { entries, readEntry };
}

async function parseWorkbookRows(file: File) {
  const workbook = await unzipWorkbook(file);
  const sheetName = [...workbook.entries.keys()].filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name)).sort()[0];
  if (!sheetName) throw new Error("The workbook needs a worksheet with a header row.");
  const [sheetXml, sharedXml] = await Promise.all([workbook.readEntry(sheetName), workbook.readEntry("xl/sharedStrings.xml")]);
  if (!sheetXml) throw new Error("The workbook worksheet is unreadable.");
  const parser = new DOMParser();
  const sharedStrings = sharedXml ? [...parser.parseFromString(sharedXml, "application/xml").getElementsByTagName("si")].map((node) => node.textContent ?? "") : [];
  const sheet = parser.parseFromString(sheetXml, "application/xml");
  if (sheet.getElementsByTagName("parsererror").length) throw new Error("The workbook worksheet could not be read.");
  const rows: string[][] = [];

  for (const cell of sheet.getElementsByTagName("c")) {
    const reference = cell.getAttribute("r");
    if (!reference) continue;
    const rowIndex = Number(reference.match(/\d+/)?.[0] ?? "0") - 1;
    const cellIndex = columnIndex(reference);
    if (rowIndex < 0 || cellIndex < 0) continue;
    const type = cell.getAttribute("t");
    const raw = cell.getElementsByTagName("v")[0]?.textContent ?? "";
    const value = type === "s" ? sharedStrings[Number(raw)] ?? "" : type === "inlineStr" ? cell.getElementsByTagName("is")[0]?.textContent ?? "" : raw;
    rows[rowIndex] ??= [];
    rows[rowIndex][cellIndex] = value;
  }
  return rows.map((row) => row.map((value) => value ?? "")).filter((row) => row.some((value) => value.trim()));
}

function summariseRows(rows: string[][], fileName: string, format: ImportSummary["format"]): ImportSummary {
  if (rows.length < 2) return { fileName, format, rows: 0, valid: 0, invalid: 0, missingRequiredReportingHeaders: requiredReportingHeaders, message: "Add a header row and at least one learner row." };
  const headers = rows[0].map(normaliseHeader);
  const emailIndex = headers.indexOf("email");
  const missingRequiredReportingHeaders = requiredReportingHeaders.filter((header) => !headers.includes(header));
  const learnerRows = rows.slice(1);
  if (emailIndex < 0) return { fileName, format, rows: learnerRows.length, valid: 0, invalid: learnerRows.length, missingRequiredReportingHeaders, message: "The file needs an email column before it can be reviewed." };
  const valid = learnerRows.filter((row) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((row[emailIndex] ?? "").trim())).length;
  const missingFields = missingRequiredReportingHeaders.length ? ` Add required reporting columns: ${missingRequiredReportingHeaders.join(", ")}.` : "";
  return {
    fileName, format, rows: learnerRows.length, valid, invalid: learnerRows.length - valid, missingRequiredReportingHeaders,
    message: valid === learnerRows.length ? `Email values are valid and a local import draft is ready.${missingFields}` : `Correct the invalid email values before reviewing this import.${missingFields}`
  };
}

function toInvitationRows(rows: string[][], allowedCourses: Set<string>, organisations: Map<string, string>, groups: Array<{ id: string; name: string; organisation_id: string }>, defaultGroup: string): { invitations: ImportRow[]; error: string | null } {
  if (rows.length < 2) return { invitations: [], error: "Add a header row and at least one learner row." };
  const headers = rows[0].map(normaliseHeader);
  const required = ["email", "organisation_slug", "course_slug", "access_basis", "reason", "expires_at"];
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length) return { invitations: [], error: `The import needs these columns before it can be sent: ${missing.join(", ")}.` };
  const indexOf = (header: string) => headers.indexOf(header);
  const value = (row: string[], header: string) => row[indexOf(header)]?.trim() ?? "";
  const invitations: ImportRow[] = [];

  for (const [index, row] of rows.slice(1).entries()) {
    const courseId = value(row, "course_slug");
    const recipientEmail = value(row, "email").toLowerCase();
    const basis = value(row, "access_basis");
    const reason = value(row, "reason");
    const expiresAt = value(row, "expires_at");
    const organisationSlug = value(row, "organisation_slug").toLowerCase();
    const organisationId = organisations.get(organisationSlug);
    const groupName = value(row, "group_name");
    const group = groupName ? groups.find(g => g.organisation_id === organisationId && g.name.toLowerCase() === groupName.toLowerCase()) : groups.find(g => g.id === defaultGroup);
    if (value(row, "role") && value(row, "role") !== "learner") return { invitations: [], error: `Row ${index + 2}: invite administrators individually so their access is explicitly confirmed.` };
    if ((groupName || defaultGroup) && (!group || group.organisation_id !== organisationId)) return { invitations: [], error: `Row ${index + 2}: create or choose a group belonging to this organisation before import.` };
    if (!recipientEmail || !courseId || !basis || !reason || !expiresAt || !organisationId || !allowedCourses.has(courseId)) {
      return { invitations: [], error: `Correct row ${index + 2}: every learner needs a recognised organisation_slug, valid course_slug, access_basis, reason and expires_at value.` };
    }
    invitations.push({
      rowNumber: index + 2,
      recipientEmail,
      courseId,
      basis,
      reason,
      expiresAt,
      reference: value(row, "reference"),
      company: value(row, "company"),
      organisationId, groupId: group?.id, role: "learner"
    });
  }
  return { invitations, error: null };
}

export function LearnerImportWorkspace({ courses, organisations, groups = [] }: { courses: Array<{ id: string; title: string }>; organisations: Array<{ id: string; slug: string }>; groups?: Array<{ id: string; name: string; organisation_id: string }> }) {
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [invitations, setInvitations] = useState<ImportRow[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [deliveryResult, setDeliveryResult] = useState<{ sent: number; failed: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const [defaultGroup, setDefaultGroup] = useState("");
  const [testLinks, setTestLinks] = useState<Array<{ recipientEmail: string; invitationUrl?: string; error?: string }>>([]);
  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([template], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "apgi-learner-import-template.csv";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setReviewed(false);
    setConfirmed(false);
    setDeliveryResult(null);
    setTestLinks([]);
    setImportError(null);
    try {
      const isWorkbook = /\.xlsx$/i.test(file.name);
      if (!isWorkbook && !/\.(csv|tsv|txt)$/i.test(file.name)) throw new Error("Choose a CSV, TSV, text file or an Excel (.xlsx) workbook.");
      const rows = isWorkbook ? await parseWorkbookRows(file) : parseTextRows(await file.text());
      setSummary(summariseRows(rows, file.name, isWorkbook ? "Excel workbook" : "CSV"));
      const prepared = toInvitationRows(rows, new Set(courses.map((course) => course.id)), new Map(organisations.map((organisation) => [organisation.slug, organisation.id])), groups, defaultGroup);
      setInvitations(prepared.invitations);
      setImportError(prepared.error);
    } catch (error) {
      setSummary({ fileName: file.name, format: "CSV", rows: 0, valid: 0, invalid: 0, missingRequiredReportingHeaders: requiredReportingHeaders, message: error instanceof Error ? error.message : "The selected file could not be staged." });
      setInvitations([]);
      setImportError(error instanceof Error ? error.message : "The selected file could not be staged.");
    }
  }
  const reviewReady = Boolean(summary && summary.rows > 0 && summary.invalid === 0 && summary.missingRequiredReportingHeaders.length === 0 && invitations.length === summary.rows && !importError);
  function sendInvitations() {
    if (!confirmed || !invitations.length) return;
    startTransition(async () => {
      const result = await createBatchInvitations({ invitations });
      setDeliveryResult({ sent: result.sent, failed: result.failed });
      setTestLinks(result.recipientResults);
    });
  }
  return <section className="import-workspace" aria-labelledby="import-heading"><div className="admin-card-heading"><div><p className="eyebrow">Bulk intake</p><h2 id="import-heading">Import learners</h2></div><span className="status-badge status-draft">Review before send</span></div><p>Choose a CSV or Excel workbook, validate it locally, then create one invitation per valid learner. The source file is not retained by the platform.</p><label>Default group for this import<select value={defaultGroup} onChange={e => { setDefaultGroup(e.target.value); setReviewed(false); setInvitations([]); setSummary(null); setConfirmed(false); setDeliveryResult(null); setTestLinks([]); setImportError(null); }}><option value="">Individual learner (no group)</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label><p>Choose the group before selecting a file. Optional group_name overrides the default. Blank uses the default or Individual learner.</p><div className="import-actions"><button className="secondary-button" type="button" onClick={downloadTemplate}>Download CSV template</button><label className="primary-button file-choice">Choose spreadsheet<input type="file" accept=".csv,.tsv,.txt,.xlsx,text/csv,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={chooseFile} /></label></div><p className="import-hint">Required: <code>email</code>, <code>company</code>, <code>country</code>, <code>organisation_slug</code>, <code>course_slug</code>, <code>access_basis</code>, <code>reason</code> and <code>expires_at</code>. Identity numbers remain browser-local and are never sent as part of an invitation.</p>{summary ? <div className="import-summary" aria-live="polite"><strong>{summary.rows} rows staged from {summary.fileName}</strong><span>{summary.format} · {summary.valid} valid · {summary.invalid} need attention</span><p>{summary.message}</p></div> : null}{importError ? <p className="form-error" role="alert">{importError}</p> : null}<div className="import-steps" aria-label="Import steps"><span className="active">1 Upload</span><span className={summary ? "active" : undefined}>2 Validate</span><span className={reviewReady ? "active" : undefined}>3 Review</span><span className={deliveryResult ? "active" : undefined}>4 Send</span></div><button className="primary-button" type="button" onClick={() => setReviewed(true)} disabled={!reviewReady}>Review import</button>{reviewed && summary ? <div className="draft-summary" aria-live="polite"><strong>Import draft prepared</strong><strong>{invitations.length} invitations ready</strong><span>Review the count, then confirm before invitations are created. Email-enabled environments send to the invited email address.</span><label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> I confirm that these learners should receive course invitations now.</label><button className="primary-button" type="button" onClick={sendInvitations} disabled={!confirmed || pending}>{pending ? "Creating invitations…" : "Send enrolment invitations"}</button></div> : null}{deliveryResult ? <p className="feedback feedback-correct" aria-live="polite">{deliveryResult.sent} invitation{deliveryResult.sent === 1 ? "" : "s"} created; {deliveryResult.failed} require follow-up.</p> : null}{testLinks.length ? <div>{testLinks.map((r,i) => <p key={i}>{r.recipientEmail}: {r.invitationUrl ? <a href={r.invitationUrl} target="_blank" rel="noopener noreferrer">Open test invitation (email disabled)</a> : r.error ?? "Invitation accepted by the email provider."}</p>)}</div> : null}</section>;
}
