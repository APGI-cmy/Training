import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { SCANNEX_AUTOMATION_ITEMS, SCANNEX_AUTOMATION_PREREQUISITES, SCANNEX_AUTOMATION_RAW_TOTAL } from "@/lib/assessments/scannex-automation-plan";

export const dynamic = "force-dynamic";

export default async function ScannexAutomationPage() {
  await requireAdmin();
  return <main className="admin-page">
    <header className="admin-page-header">
      <div>
        <p className="eyebrow">Scannex assessment development</p>
        <h1>Automated practical assessment</h1>
        <p>Target: instructions, genuine Viewer use, evidence collection and scoring in one browser session, without an assessor operating each attempt.</p>
      </div>
    </header>
    <section className="admin-form-card">
      <h2>Readiness review · 25 September 2026</h2>
      <p className="resource-status">Integration development is in progress. Live learner streaming remains disabled pending case and native-evidence validation.</p>
      <Link className="primary-button" href="/admin/assessments/automation/manage">Manage readiness requests and case versions</Link>
      <p>Initial case calibration and software validation are separate from unattended learner delivery. Existing results and marking standards remain in force while the automated route is built.</p>
      <ol>{SCANNEX_AUTOMATION_PREREQUISITES.map((item) => <li key={item.title}><strong>{item.title}</strong><p>{item.detail}</p></li>)}</ol>
    </section>
    <section className="directory-card">
      <div className="admin-card-heading"><div><p className="eyebrow">{SCANNEX_AUTOMATION_ITEMS.length} items · {SCANNEX_AUTOMATION_RAW_TOTAL} marks across the current rows</p><h2>Instructions and evidence mapping</h2></div></div>
      <p>These proposed evidence requirements must be validated before they become scoring rules. A missing log is an incomplete attempt, not a zero or a pass.</p>
      <div className="directory-table-wrap">
        <table className="directory-table scannex-automation-table">
          <thead><tr><th>Assessment item</th><th>Draft learner instruction</th><th>Evidence needed for automatic scoring</th><th>Status</th></tr></thead>
          <tbody>{SCANNEX_AUTOMATION_ITEMS.map((item) => <tr key={item.id}>
            <td><strong>{item.label}</strong><span>{item.section} · {item.maximumScore} marks</span></td>
            <td>{item.instruction}</td><td>{item.evidence}</td><td>{item.status}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
    <div className="button-row">
      <Link className="primary-button" href="/admin/courses/scannex-training-programme/preview/lu9">Preview the summative assessment</Link>
      <Link className="secondary-button" href="/admin/assessments">Return to assessment operations</Link>
    </div>
  </main>;
}
