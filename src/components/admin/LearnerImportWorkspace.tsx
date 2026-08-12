"use client";

import { useState, type ChangeEvent } from "react";

type ImportSummary = { rows: number; valid: number; invalid: number; message: string };
const template = "email,first_name,last_name,company,course_slug,access_basis,reason,expires_at\nlearner@example.com,Ada,Lovelace,Example Company,scannex-training-programme,corporate_order,Corporate training allocation,2026-12-31T23:59\n";

function parseFile(text: string): ImportSummary {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { rows: 0, valid: 0, invalid: 0, message: "Add a header row and at least one learner row." };
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].toLowerCase().split(delimiter).map((header) => header.trim());
  const emailIndex = headers.indexOf("email");
  if (emailIndex < 0) return { rows: lines.length - 1, valid: 0, invalid: lines.length - 1, message: "The file needs an email column." };
  const rows = lines.slice(1);
  const valid = rows.filter((row) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((row.split(delimiter)[emailIndex] ?? "").trim())).length;
  return { rows: rows.length, valid, invalid: rows.length - valid, message: valid === rows.length ? "Headers and email values look ready for a future review." : "Correct the highlighted email values before a future review." };
}

export function LearnerImportWorkspace() {
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([template], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "apgi-learner-import-template.csv";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.(csv|tsv|txt)$/i.test(file.name)) { setSummary({ rows: 0, valid: 0, invalid: 0, message: "Use the CSV template (it opens in Excel) and save it as CSV for this staged review." }); return; }
    const reader = new FileReader();
    reader.onload = () => setSummary(parseFile(String(reader.result ?? "")));
    reader.readAsText(file);
  }
  return <section className="import-workspace" aria-labelledby="import-heading"><div className="admin-card-heading"><div><p className="eyebrow">Bulk intake</p><h2 id="import-heading">Import learners</h2></div><span className="status-badge status-draft">Staged only</span></div><p>Prepare a CSV in Excel, validate it locally, and review the outcome. Source rows are not uploaded and no learner or invitation is created.</p><div className="import-actions"><button className="secondary-button" type="button" onClick={downloadTemplate}>Download CSV template</button><label className="primary-button file-choice">Choose CSV file<input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" onChange={chooseFile} /></label></div><p className="import-hint">Required now: <code>email</code>. The template includes first name, last name, company, course, basis, reason and expiry fields for the future governed workflow.</p>{summary ? <div className="import-summary" aria-live="polite"><strong>{summary.rows} rows staged</strong><span>{summary.valid} valid · {summary.invalid} need attention</span><p>{summary.message}</p></div> : null}<div className="import-steps" aria-label="Planned import steps"><span className="active">1 Upload</span><span>2 Validate</span><span>3 Match fields</span><span>4 Review import draft</span></div><button className="primary-button" type="button" disabled>Review import draft</button><p className="disabled-guidance">Import execution is disabled until the test learner, lifecycle, duplicate-handling and delivery decision are agreed.</p></section>;
}
