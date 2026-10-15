import { CertificatePreview } from "@/components/certificates/CertificatePreview";
import { isDesign, safeColor } from "@/lib/certificates/designs";
import { StructureForm } from "./StructureForm";
import { companyStructureAction } from "@/server/actions/company-structure";
import { certificateDesigns } from "@/lib/certificates/designs";
import { getSupabaseRestUrl } from "@/server/auth/session";
import type { CompanyRecord } from "@/lib/company-structure";
export function CompanyBrandForm({ company }: { company: CompanyRecord }) {
  return (
    <section className="admin-form-card">
      <h2>Branding and certificate</h2>
      <p>
        Your company identity is independent of the master course. Published
        changes apply to this company; existing certificates retain their
        original brand assets.
      </p>
      {company.logo_path ? (
        <img
          className="branding-logo-preview"
          src={
            getSupabaseRestUrl(
              `/storage/v1/object/public/alp-branding-assets/${company.logo_path}`,
            ) ?? ""
          }
          alt={`${company.name} logo`}
        />
      ) : null}
      <StructureForm
        action={companyStructureAction}
        label="Save company branding"
      >
        <input type="hidden" name="operation" value="brand" />
        <input type="hidden" name="organisation_id" value={company.id} />
        <label>
          Company display name
          <input
            name="name"
            defaultValue={company.name}
            required
            maxLength={120}
          />
        </label>
        <label>
          Support email
          <input
            type="email"
            name="contact_email"
            defaultValue={company.contact_email ?? ""}
          />
        </label>
        <label>
          Company logo
          <input
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp"
          />
          <small>PNG, JPEG or WebP, up to 2 MB.</small>
        </label>
        <label>
          Certificate design
          <select
            name="certificate_template_id"
            defaultValue={company.certificate_template_id}
          >
            {certificateDesigns.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        {(
          [
            "primary_color",
            "secondary_color",
            "accent_color",
            "pale_color",
          ] as const
        ).map((key) => (
          <label key={key}>
            {key.replaceAll("_", " ")}
            <input type="color" name={key} defaultValue={company[key]} />
          </label>
        ))}
        <p className="admin-span-two">
          Hosted by APGI remains visible. The certificate design does not change
          course completion or assessment requirements.
        </p>
      </StructureForm>
      <h3>Current certificate preview</h3>
      <CertificatePreview
        snapshot={{
          name: "Sample Learner",
          course: "Course title",
          organisation: company.name,
          templateId: isDesign(company.certificate_template_id)
            ? company.certificate_template_id
            : "classic",
          primary: safeColor(company.primary_color),
          secondary: safeColor(company.secondary_color),
          accent: safeColor(company.accent_color),
          logoPath: company.logo_path,
          test: true,
          statement:
            "Preview only. Course and assessment requirements remain unchanged.",
        }}
        logoUrl={
          company.logo_path
            ? getSupabaseRestUrl(
                `/storage/v1/object/public/alp-branding-assets/${company.logo_path}`,
              )
            : null
        }
      />
    </section>
  );
}
