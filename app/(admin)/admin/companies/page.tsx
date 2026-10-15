import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { accessibleCompanies } from "@/server/services/company-structure";
import { StructureForm } from "@/components/admin/StructureForm";
import { companyStructureAction } from "@/server/actions/company-structure";
export default async function CompaniesPage() {
  await requireAdmin();
  const companies = await accessibleCompanies();
  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Company workspaces</p>
          <h1>Companies and branding</h1>
          <p>
            Create a company, assign its courses and appoint a business owner.
            Commercial terms remain separate drafts while the policy is being
            reviewed.
          </p>
        </div>
      </header>
      <section className="admin-form-card">
        <h2>Create a company</h2>
        <StructureForm action={companyStructureAction} label="Create company">
          <input type="hidden" name="operation" value="create" />
          <label>
            Company name
            <input name="name" required maxLength={120} />
          </label>
          <label>
            Business-owner email (optional)
            <input name="owner_email" type="email" />
            <small>
              Entering an email sends a scoped company-owner invitation when you
              create the company.
            </small>
          </label>
        </StructureForm>
      </section>
      <section className="admin-launch-grid">
        {companies.map((c) => (
          <article className="admin-form-card" key={c.id}>
            <h2>{c.name}</h2>
            <p>
              {c.slug} · brand revision {c.brand_revision}
            </p>
            <Link className="primary-button" href={`/company/${c.id}`}>
              Manage company
            </Link>
          </article>
        ))}
      </section>
      <p>
        <Link href="/admin/agreements">Commercial draft workspace</Link> ·{" "}
        <Link href="/admin/policies">Platform policies</Link>
      </p>
    </main>
  );
}
