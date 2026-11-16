import { requireSession } from "@/server/auth/session";
import { accessibleCompanies } from "@/server/services/company-structure";
import { switchCompany } from "@/server/actions/company-structure";
export default async function CompanyIndex() {
  const session = await requireSession();
  const companies = await accessibleCompanies(session);
  return (
    <main className="admin-page">
      <h1>Your company workspaces</h1>
      <p>
        Open an authorised company workspace. Your company roles are separate
        from platform administrator access.
      </p>
      <section className="admin-launch-grid">
        {companies.map((c) => (
          <form className="admin-form-card" action={switchCompany} key={c.id}>
            <h2>{c.name}</h2>
            <input type="hidden" name="organisation_id" value={c.id} />
            <button className="primary-button">Open workspace</button>
          </form>
        ))}
      </section>
      {!companies.length ? (
        <p>
          You do not have a company membership yet. Complete your invited
          Profile or contact your administrator.
        </p>
      ) : null}
    </main>
  );
}
