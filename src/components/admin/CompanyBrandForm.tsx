import {WatermarkFields} from '@/components/branding/WatermarkFields';
import {PlatformWatermark} from '@/components/branding/PlatformWatermark';
import {companyWatermarks} from '@/lib/watermarks';
import {currentCertificateHeader} from '@/lib/certificates/designs';
import { CertificatePreview } from "@/components/certificates/CertificatePreview";
import { isDesign, safeColor } from "@/lib/certificates/designs";
import { StructureForm } from "./StructureForm";
import { companyStructureAction } from "@/server/actions/company-structure";
import { certificateDesigns } from "@/lib/certificates/designs";
import { getSupabaseRestUrl } from "@/server/auth/session";
import type { CompanyRecord } from "@/lib/company-structure";
export function CompanyBrandForm({ company, returnTo }: { company: CompanyRecord; returnTo?: string | null }) {
  const wm=companyWatermarks(company.watermarks);
  const logoUrl=company.logo_path?getSupabaseRestUrl(`/storage/v1/object/public/alp-branding-assets/${company.logo_path}`):null;
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
        {returnTo ? <input type="hidden" name="return_to" value={returnTo} /> : null}
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
          Your company identity appears on learner pages and new certificates. The certificate design does not change
          course completion or assessment requirements.
        </p>
      </StructureForm>
      <h3>Watermark settings</h3>
      <p>Save watermarks separately from company contact details, logo and colours. Saved platform watermarks apply automatically in this company’s workspace.</p>
      <StructureForm action={companyStructureAction} label="Save watermark settings">
        <input type="hidden" name="operation" value="watermarks"/>
        <input type="hidden" name="organisation_id" value={company.id}/>
        <WatermarkFields prefix="platform_watermark" label="Platform background watermark" value={wm.platform}/>
        <WatermarkFields prefix="certificate_watermark" label="Certificate watermark — all sample designs" value={wm.certificate}/>
      </StructureForm>
      <h3>Platform watermark preview</h3><div className="watermark-platform-sample" style={{position:"relative",isolation:"isolate",overflow:"hidden",minHeight:220,border:"1px solid var(--line)",borderRadius:8,padding:24}}><PlatformWatermark value={wm.platform} logoUrl={logoUrl} imageUrl={wm.platform.imagePath?getSupabaseRestUrl(`/storage/v1/object/public/alp-branding-assets/${wm.platform.imagePath}`):null} preview/><h4>{company.name} Training</h4><p>Your learning workspace. A watermark is decorative and does not change permissions or course requirements.</p></div>
      <h3>Current certificate preview</h3>
      <CertificatePreview
        snapshot={{
          ...currentCertificateHeader(),
          watermark:wm.certificate,
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
        watermarkUrl={wm.certificate.imagePath?getSupabaseRestUrl(`/storage/v1/object/public/alp-branding-assets/${wm.certificate.imagePath}`):null}
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
