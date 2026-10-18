import Link from "next/link";
import { publicationReturnPath } from "@/lib/publication-return";
import { isPlatformPrincipal } from "@/server/services/platform-principals";
import { notFound } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import {
  requireCompany,
  ownMemberships,
  rows,
  companyOfferings,
} from "@/server/services/company-structure";
import { CompanyBrandForm } from "@/components/admin/CompanyBrandForm";
import { StructureForm } from "@/components/admin/StructureForm";
import {
  companyStructureAction,
  switchCompany,
} from "@/server/actions/company-structure";
import { getCourses, getCourseBySlug } from "@/lib/courses";
import { CourseCardCover } from "@/components/course/CourseCardCover";
import catalogueStyles from "@/components/course/compact-course-catalogue.module.css";
export default async function CompanyPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{returnTo?:string}>;
}) {
  await requireSession();
  const { id } = await params;
  let access;
  try {
    access = await requireCompany(id, false);
  } catch {
    notFound();
  }
  const { company, session, isAdmin } = access;
  const principal = isAdmin && await isPlatformPrincipal(session);
  const returnTo = principal ? publicationReturnPath((await searchParams).returnTo) : null;
  const owner =
    isAdmin ||
    (await ownMemberships(session, true)).some((m) => m.organisation_id === id);
  const offerings = await companyOfferings(id);
  const requests = owner
    ? await rows<{
        id: string;
        subject: string;
        description: string;
        status: string;
        response: string | null;
      }>(
        `/rest/v1/company_change_requests?organisation_id=eq.${id}&select=id,subject,description,status,response&order=created_at.desc&limit=50`,
      )
    : [];
  const memberships = isAdmin
    ? await rows<{ user_id: string }>(
        `/rest/v1/organisation_memberships?organisation_id=eq.${id}&membership_role=eq.owner&is_active=eq.true&select=user_id`,
      )
    : [];
  return (
    <main className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">Hosted by APGI</p>
          <h1>{company.name}</h1>
          <p>
            {owner
              ? "Manage your company identity and certificate, review assigned policies and request changes."
              : "Your company learning workspace."}
          </p>
        </div>
        <form action={switchCompany}>
          <input type="hidden" name="organisation_id" value={id} />
          <button className="secondary-button">Use this workspace</button>
        </form>
      </header>
      <nav className="button-row">
        {returnTo ? <Link href={`${returnTo}?brand=${id}`}>Return to course preparation</Link> : null}
        <Link href="/company">Switch company</Link>
        {owner ? <Link href="/policies">Policies and reviews</Link> : null}
        {isAdmin ? <Link href="/admin/companies">All companies</Link> : null}
      </nav>
      <section className="admin-form-card">
        <h2>Company courses</h2>
        <div className={catalogueStyles.grid}>
          {offerings
            .filter((o) => isAdmin || o.status === "published")
            .map((o) => {
              const c = getCourseBySlug(o.course_id);
              return c ? (
                <article className={`course-card course-card--visual ${catalogueStyles.card}`} key={o.id}>
                  <CourseCardCover courseSlug={c.slug} />
                  <div className="course-card-body">
                    <h3>{c.title}</h3>
                    <p>{o.status}</p>
                    <Link
                      href={
                        isAdmin
                          ? `/admin/courses/${c.slug}/preview`
                          : `/learn/${c.slug}`
                      }
                    >
                      {isAdmin ? "Preview course" : "Open enrolled course"}
                    </Link>
                  </div>
                </article>
              ) : null;
            })}
        </div>
        {!offerings.length ? <p>No courses assigned yet.</p> : null}
        {principal ? (
          <StructureForm
            action={companyStructureAction}
            label="Save course assignment"
          >
            <input type="hidden" name="operation" value="offering" />
            <input type="hidden" name="organisation_id" value={id} />
            <label>
              Course
              <select name="course_id">
                {getCourses().map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Offering status
              <select name="status">
                <option value="draft">Draft</option>
                <option value="published">
                  Published for company invitations
                </option>
                <option value="archived">
                  Archived (existing enrolments retained)
                </option>
              </select>
            </label>
            <p className="admin-span-two">
              A course can be assigned to several companies. Publishing an
              assignment does not enrol learners, grant assessment access or
              enable payments.
            </p>
          </StructureForm>
        ) : null}
      </section>
      {owner ? (
        <>
          <CompanyBrandForm company={company} returnTo={returnTo} />
          <section className="admin-form-card">
            <h2>Request a course or platform change</h2>
            <StructureForm
              action={companyStructureAction}
              label="Submit request"
            >
              <input type="hidden" name="operation" value="request" />
              <input type="hidden" name="organisation_id" value={id} />
              <label>
                Subject
                <input name="subject" required minLength={3} maxLength={150} />
              </label>
              <label>
                Description
                <textarea
                  name="description"
                  required
                  minLength={10}
                  maxLength={5000}
                />
              </label>
            </StructureForm>
            {requests.map((r) => (
              <article className="draft-summary" key={r.id}>
                <strong>
                  {r.subject} · {r.status}
                </strong>
                <p>{r.description}</p>
                {r.response ? <p>APGI response: {r.response}</p> : null}
                {isAdmin ? (
                  <StructureForm
                    action={companyStructureAction}
                    label="Save response"
                  >
                    <input type="hidden" name="operation" value="respond" />
                    <input type="hidden" name="organisation_id" value={id} />
                    <input type="hidden" name="request_id" value={r.id} />
                    <label>
                      Status
                      <select name="status">
                        <option value="reviewing">Reviewing</option>
                        <option value="completed">Completed</option>
                        <option value="declined">Declined</option>
                      </select>
                    </label>
                    <label>
                      Response
                      <textarea name="response" required minLength={3} />
                    </label>
                  </StructureForm>
                ) : null}
              </article>
            ))}
          </section>
        </>
      ) : null}
      {isAdmin ? (
        <section className="admin-form-card">
          <h2>Appoint a business owner</h2>
          <p>
            This invitation grants access only to {company.name}; it does not
            grant APGI administrator rights.
          </p>
          <StructureForm
            action={companyStructureAction}
            label="Send company-owner invitation"
          >
            <input type="hidden" name="operation" value="invite_owner" />
            <input type="hidden" name="organisation_id" value={id} />
            <label>
              Owner email
              <input type="email" name="owner_email" required />
            </label>
          </StructureForm>
          {memberships.map((m) => (
            <form
              action={async (form) => {
                "use server";
                await companyStructureAction({}, form);
              }}
              key={m.user_id}
            >
              <input type="hidden" name="operation" value="revoke_owner" />
              <input type="hidden" name="organisation_id" value={id} />
              <input type="hidden" name="user_id" value={m.user_id} />
              <p>Owner account {m.user_id}</p>
              <button className="secondary-button">
                Revoke company-owner access
              </button>
            </form>
          ))}
        </section>
      ) : null}
    </main>
  );
}
