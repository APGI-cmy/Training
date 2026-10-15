import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { listPolicies } from "@/server/services/company-structure";
export default async function MyPolicies() {
  await requireSession();
  const policies = await listPolicies();
  return (
    <main className="admin-page">
      <h1>Your policies and review requests</h1>
      <p>
        Only your company documents and versions explicitly assigned to you
        appear here.
      </p>
      {policies.map((p) => (
        <article key={p.id} className="admin-form-card">
          <h2>{p.title}</h2>
          <p>
            {p.version_label} · {p.status}
          </p>
          <Link href={`/policies/${p.id}`}>Read and review</Link>
        </article>
      ))}
      {!policies.length ? <p>No policies are assigned to you yet.</p> : null}
    </main>
  );
}
