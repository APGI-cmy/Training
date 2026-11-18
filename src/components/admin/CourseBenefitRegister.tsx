import { requireAdmin } from "@/lib/auth/require-admin";
import { adminRest } from "@/server/supabase/admin-rest";
import { CourseBenefitForm } from "@/components/course/CourseBenefitForm";

type RequestRow = { id: string; learner_user_id: string; status: string; after_attempt_number: number; learner_note: string; review_note: string | null };
type EventRow = { id: string; learner_user_id: string; event_type: string; occurred_at: string; details: Record<string, unknown> };

export async function CourseBenefitRegister() {
  await requireAdmin();
  const [requestsResponse, eventsResponse] = await Promise.all([
    adminRest("/rest/v1/v1_retake_requests?select=*&order=created_at.desc&limit=100"),
    adminRest("/rest/v1/v1_course_benefit_events?select=*&order=occurred_at.desc&limit=50")
  ]);
  if (!requestsResponse.ok || !eventsResponse.ok) return <section className="directory-card"><h2>Course benefits register</h2><p>Records could not be loaded. Please retry; no empty register is being assumed.</p></section>;
  const requests = await requestsResponse.json() as RequestRow[];
  const events = await eventsResponse.json() as EventRow[];
  const ids = [...new Set([...requests, ...events].map(r => r.learner_user_id))];
  const names = new Map<string, string>();
  if (ids.length) {
    const response = await adminRest(`/rest/v1/profiles?user_id=in.(${ids.join(",")})&select=user_id,full_name,email`);
    if (response.ok) for (const p of await response.json() as {user_id: string; full_name: string; email: string}[]) names.set(p.user_id, `${p.full_name || "Learner"} — ${p.email || p.user_id}`);
  }
  return <section className="directory-card"><p className="eyebrow">Version 1 course benefits</p><h2>Re-enrolment requests and signed downloads</h2>
    <p>Approval permits one further course attempt. Agree any discounted price and payment separately before approving; this form does not bill the learner.</p>
    {requests.length ? requests.map(q => <article className="unit-card" key={q.id}>
      <h3>{names.get(q.learner_user_id) ?? q.learner_user_id}</h3><p>After attempt {q.after_attempt_number} · {q.status}</p><p>{q.learner_note || "No additional learner message."}</p>
      {q.review_note ? <p>APGI decision note: {q.review_note}</p> : null}
      {q.status === "pending" || q.status === "declined" ? <CourseBenefitForm admin>
        <input type="hidden" name="requestId" value={q.id}/>
        <label>Decision<select name="decision"><option value="approved">Approve one further attempt</option><option value="declined">Not approved at this time</option></select></label>
        <label>Agreed terms / decision reason<textarea name="note" required minLength={3} maxLength={2000}/></label>
        <button className="primary-button">Record APGI decision</button>
      </CourseBenefitForm> : null}
    </article>) : <p>No re-enrolment requests recorded.</p>}
    <h3>Latest 50 audit events</h3><p>“Download authorised” and “print requested” record the requested action, not proof that a file was saved or a physical print completed.</p>
    {events.map(e => <details key={e.id}><summary>{new Date(e.occurred_at).toLocaleString("en-GB")} · {names.get(e.learner_user_id) ?? e.learner_user_id} · {e.event_type.replaceAll("_", " ")}</summary><pre className="benefit-audit">{JSON.stringify(e.details, null, 2)}</pre></details>)}
  </section>;
}
