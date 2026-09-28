"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { APGI_BRAND, type CourseBranding } from "@/lib/branding";
import { getCourses } from "@/lib/courses";
import { saveCourseBranding, type CourseBrandingFormState } from "@/server/actions/branding/save-course-branding";

const initialState: CourseBrandingFormState = {};

export function BrandingForm({ branding }: { branding: CourseBranding | null }) {
  const searchParams = useSearchParams();
  const selectedCourse = searchParams.get("course") ?? getCourses()[0]?.slug ?? "";
  const [state, formAction, pending] = useActionState(saveCourseBranding, initialState);
  const activeBrand = branding?.courseId === selectedCourse ? branding : null;
  const values = activeBrand ?? {
    brandName: "",
    logoUrl: null,
    primaryColor: APGI_BRAND.primaryColor,
    secondaryColor: APGI_BRAND.secondaryColor,
    accentColor: APGI_BRAND.accentColor,
    paleColor: APGI_BRAND.paleColor,
    footerText: "Powered by APGI",
    isActive: false,
  };

  return (
    <form action={formAction} className="admin-form-card branding-form">
      <input type="hidden" name="course_id" value={selectedCourse} />
      <input type="hidden" name="existing_logo_path" value={activeBrand?.logoUrl ? new URL(activeBrand.logoUrl).pathname.split("/alp-branding-assets/")[1] ?? "" : ""} />
      <div className="admin-card-heading">
        <p className="eyebrow">Course identity</p>
        <h2>Set client branding</h2>
        <p>Branding changes apply only while a learner views this course. The APGI administration area and other courses keep their own identity.</p>
      </div>
      <div className="admin-form-grid branding-form-grid">
        <label>
          Client or company name
          <input name="brand_name" required defaultValue={values.brandName} placeholder="Example: Acme Security Academy" />
        </label>
        <label>
          Client logo
          <input name="logo" type="file" accept="image/png,image/jpeg,image/webp" />
          <span className="field-hint">PNG, JPEG or WebP, up to 2 MB.</span>
        </label>
        <label>
          Primary colour
          <span className="color-input"><input name="primary_color" type="color" defaultValue={values.primaryColor} /><code>{values.primaryColor}</code></span>
        </label>
        <label>
          Secondary colour
          <span className="color-input"><input name="secondary_color" type="color" defaultValue={values.secondaryColor} /><code>{values.secondaryColor}</code></span>
        </label>
        <label>
          Accent colour
          <span className="color-input"><input name="accent_color" type="color" defaultValue={values.accentColor} /><code>{values.accentColor}</code></span>
        </label>
        <label>
          Pale colour
          <span className="color-input"><input name="pale_color" type="color" defaultValue={values.paleColor} /><code>{values.paleColor}</code></span>
        </label>
        <label className="admin-span-two">
          Footer attribution
          <input name="footer_text" required defaultValue={values.footerText} />
        </label>
      </div>
      {activeBrand?.logoUrl ? <img className="branding-logo-preview" src={activeBrand.logoUrl} alt="Current client logo" /> : null}
      <label className="check-row"><input type="checkbox" name="is_active" defaultChecked={values.isActive} /> Use this branding for learner-facing course pages</label>
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      {state.success ? <p className="form-success" role="status">{state.success}</p> : null}
      <button className="primary-button" type="submit" disabled={pending}>{pending ? "Saving branding…" : "Save course branding"}</button>
    </form>
  );
}
