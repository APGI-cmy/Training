import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { SCANNEX_AUTOMATION_ITEMS } from "@/lib/assessments/scannex-automation-plan";
import { ScannexCaseEditor, ScannexRequestManager } from "@/components/admin/ScannexAutomationManager";
import { livePracticalConfigured, practicalRest, type PracticalCaseRow, type PracticalRequest, type PracticalAttempt } from "@/server/services/assessments/automated-practical";

export const dynamic = "force-dynamic";
export default async function ScannexAutomationManagerPage() {
  await requireAdmin();
  let cases: PracticalCaseRow[] = [], requests: PracticalRequest[] = [], attempts: PracticalAttempt[] = [], unavailable = false;
  try {
    [cases, requests, attempts] = await Promise.all([
      practicalRest<PracticalCaseRow[]>("scannex_cases?select=*&order=created_at.desc&limit=100"),
      practicalRest<PracticalRequest[]>("scannex_requests?select=*&order=created_at.desc&limit=100"),
      practicalRest<PracticalAttempt[]>("scannex_attempts?select=*&order=started_at.desc&limit=100")
    ]);
  } catch { unavailable = true; }
  const template = JSON.stringify({ title: "New Scannex assessment case", instructions: SCANNEX_AUTOMATION_ITEMS.map(item => item.instruction).join("\n"), exerciseReference: "", imageHashes: [], adapterVersion: "", checklist: [], checks: SCANNEX_AUTOMATION_ITEMS.map(item => ({ id: item.id, criterionId: item.id, marks: item.maximumScore, source: item.id === "checklist_signed" ? "checklist" : "native", field: item.id === "checklist_signed" ? "signed" : item.id, operation: "equals", expected: true, ...(item.id === "correct_actions_recorded" ? { safetyCritical: true } : {}) })) }, null, 2);
  return <main className="admin-page">
    <header className="admin-page-header"><div><p className="eyebrow">Scannex · automated practical v2</p><h1>Practical assessment access and cases</h1><p>21 items · 100 practical marks · 32% of the summative result. Historical assessments retain their original scores.</p></div></header>
    <p className="resource-status">{livePracticalConfigured() ? "Hosted practical delivery is enabled. Only approved access windows and validated case versions can start." : "Learner streaming is disabled while native evidence capture and assessment mode are validated. Draft cases and readiness requests can be prepared now."}</p>
    {unavailable ? <p role="alert">The automated assessment database is not available. Apply the tested integration migration and check server configuration before accepting readiness requests.</p> : <>
      <ScannexRequestManager requests={requests} cases={cases.map(({ id, title, status }) => ({ id, title, status }))} />
      <section className="directory-card"><h2>Recent automated attempts</h2><p>The most recent 100 attempts are shown.</p><div className="directory-table-wrap"><table className="directory-table"><thead><tr><th>Attempt</th><th>Status</th><th>Practical /100</th><th>Knowledge /68</th><th>Final /100</th></tr></thead><tbody>{attempts.map(a => <tr key={a.id}><td>{a.id}</td><td>{a.result?.status ?? (a.checklist_submitted_at ? "Awaiting native evidence" : "In progress")}</td><td>{a.result?.practicalScore ?? "—"}</td><td>{a.theory_score}</td><td>{a.result?.finalScore ?? "—"}</td></tr>)}</tbody></table></div></section>
      <ScannexCaseEditor cases={cases} template={template} />
    </>}
    <Link className="secondary-button" href="/admin/assessments/automation">View evidence requirements and validation status</Link>
  </main>;
}
