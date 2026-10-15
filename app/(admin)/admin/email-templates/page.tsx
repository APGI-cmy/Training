import { requireAdmin } from "@/lib/auth/require-admin";
import { accessibleCompanies } from "@/server/services/company-structure";
import { brandedEmail } from "@/server/services/email/send-course-invitation";
import { getCourses } from "@/lib/courses";
import { getCourseCover } from "@/lib/course-covers";
import { getSupabaseRestUrl } from "@/server/auth/session";
import { STAGING_ORIGIN } from "@/server/environment-isolation";
export default async function EmailPreviews({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; course?: string }>;
}) {
  await requireAdmin();
  const [companies, query] = await Promise.all([
    accessibleCompanies(),
    searchParams,
  ]);
  const company = companies.find((c) => c.id === query.company) ?? companies[0];
  const courses = getCourses(),
    course = courses.find((c) => c.id === query.course) ?? courses[0],
    cover = getCourseCover(course.id);
  const html = brandedEmail({
    brand: company?.name ?? "APGI Training",
    logo: company?.logo_path
      ? getSupabaseRestUrl(
          `/storage/v1/object/public/alp-branding-assets/${company.logo_path}`,
        )
      : null,
    color: company?.primary_color,
    title: course.title,
    description: `You have been invited to enrol in ${course.title}. ${course.description} Use the invited email, verify your account and save Profile to see your course.`,
    image: cover ? new URL(cover.src, STAGING_ORIGIN).toString() : null,
    link: "#preview-only",
    button: "Open your course invitation",
    footer:
      "Preview only. Real invitations include the secure link, expiry and the matching company identity. Hosted by APGI.",
  });
  return (
    <main className="admin-page">
      <h1>Branded email previews</h1>
      <p>
        Course and business-owner invitations inherit the company logo and
        colours. The verified APGI email domain remains the sender. This preview
        does not send an email.
      </p>
      <form className="admin-form-card admin-form-grid">
        <label>
          Company
          <select name="company" defaultValue={company?.id}>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Course
          <select name="course" defaultValue={course.id}>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-button">Preview email</button>
      </form>
      <iframe
        title="Branded course invitation preview"
        srcDoc={html}
        sandbox=""
        style={{
          width: "100%",
          height: 820,
          border: "1px solid var(--line)",
          borderRadius: 12,
        }}
      />
      <p>
        Approval notifications use a separate review template. No email link
        records an approval; the recipient must sign in and explicitly submit a
        decision.
      </p>
    </main>
  );
}
