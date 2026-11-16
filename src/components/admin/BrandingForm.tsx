"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { APGI_BRAND, type BrandingPreset, type CourseBranding } from "@/lib/branding";
import { getCourses } from "@/lib/courses";
import { applyBrandingPreset, restoreApgIBranding, saveCourseBranding, type CourseBrandingFormState } from "@/server/actions/branding/save-course-branding";

const initialState: CourseBrandingFormState = {};
type FormBranding = Omit<CourseBranding, "courseId" | "isActive">;

function defaultBranding(): FormBranding {
  return { brandName: "", logoUrl: null, primaryColor: APGI_BRAND.primaryColor, secondaryColor: APGI_BRAND.secondaryColor, accentColor: APGI_BRAND.accentColor, paleColor: APGI_BRAND.paleColor, footerText: "Powered by APGI" };
}

function objectPath(logoUrl: string | null) {
  return logoUrl ? new URL(logoUrl).pathname.split("/alp-branding-assets/")[1] ?? "" : "";
}

export function BrandingForm({ branding, presets }: { branding: CourseBranding | null; presets: BrandingPreset[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCourse = searchParams.get("course") ?? getCourses()[0]?.slug ?? "";
  const [state, formAction, pending] = useActionState(saveCourseBranding, initialState);
  const [editingPreset, setEditingPreset] = useState<BrandingPreset | null>(null);
  const [libraryState, setLibraryState] = useState<CourseBrandingFormState>({});
  const [libraryPending, startLibraryTransition] = useTransition();
  const activeBrand = branding?.courseId === selectedCourse ? branding : null;
  const values = editingPreset ?? activeBrand ?? defaultBranding();
  const formKey = `${selectedCourse}-${editingPreset?.id ?? activeBrand?.brandName ?? "new"}`;

  useEffect(() => {
    window.dispatchEvent(new Event("alp-branding-updated"));
  }, [selectedCourse]);

  useEffect(() => {
    if (!state.success) return;
    window.dispatchEvent(new Event("alp-branding-updated"));
    router.replace(`/admin/branding?course=${selectedCourse}`, { scroll: false });
    router.refresh();
  }, [router, selectedCourse, state.success]);

  function applyPreset(presetId: string) {
    startLibraryTransition(async () => {
      const result = await applyBrandingPreset({ courseId: selectedCourse, presetId });
      setLibraryState(result);
      if (result.success) {
        setEditingPreset(null);
        window.dispatchEvent(new Event("alp-branding-updated"));
        router.replace(`/admin/branding?course=${selectedCourse}`, { scroll: false });
        router.refresh();
      }
    });
  }

  function restoreApgI() {
    startLibraryTransition(async () => {
      const result = await restoreApgIBranding(selectedCourse);
      setLibraryState(result);
      if (result.success) {
        setEditingPreset(null);
        window.dispatchEvent(new Event("alp-branding-updated"));
        router.replace(`/admin/branding?course=${selectedCourse}`, { scroll: false });
        router.refresh();
      }
    });
  }

  return (
    <div className="branding-workspace">
      <section className="branding-library" aria-labelledby="saved-branding-heading">
        <div>
          <p className="eyebrow">Branding library</p>
          <h2 id="saved-branding-heading">Saved branding</h2>
          <p>Apply a previous client identity to this course, or load it into the form to edit it.</p>
        </div>
        <button className="secondary-button" type="button" onClick={restoreApgI} disabled={libraryPending}>Restore APGI branding</button>
        {presets.length ? <div className="branding-preset-list">
          {presets.map((preset) => <article className="branding-preset" key={preset.id}>
            {preset.logoUrl ? <img src={preset.logoUrl} alt="" /> : <span className="branding-preset-mark" style={{ background: preset.secondaryColor }} />}
            <div><strong>{preset.brandName}</strong><span>{preset.footerText}</span></div>
            <div className="branding-preset-actions">
              <button className="secondary-button" type="button" onClick={() => applyPreset(preset.id)} disabled={libraryPending}>Apply</button>
              <button className="text-button" type="button" onClick={() => { setEditingPreset(preset); setLibraryState({}); }}>Edit branding</button>
            </div>
          </article>)}
        </div> : <p className="branding-empty">Save a client branding below to add it to this library.</p>}
        {libraryState.error ? <p className="form-error" role="alert">{libraryState.error}</p> : null}
        {libraryState.success ? <p className="form-success" role="status">{libraryState.success}</p> : null}
      </section>

      <form key={formKey} action={formAction} className="admin-form-card branding-form">
        <input type="hidden" name="course_id" value={selectedCourse} />
        <input type="hidden" name="preset_id" value={editingPreset?.id ?? ""} />
        <input type="hidden" name="existing_logo_path" value={objectPath(values.logoUrl)} />
        <div className="admin-card-heading"><p className="eyebrow">Course identity</p><h2>{editingPreset ? `Edit ${editingPreset.brandName}` : "Set client branding"}</h2><p>Saving also adds or updates this reusable branding in the library.</p></div>
        <div className="admin-form-grid branding-form-grid">
          <label>Client or company name<input name="brand_name" required defaultValue={values.brandName} placeholder="Example: Acme Security Academy" /></label>
          <label>Client logo<input name="logo" type="file" accept="image/png,image/jpeg,image/webp" /><span className="field-hint">PNG, JPEG or WebP, up to 2 MB.</span></label>
          <label>Primary colour<span className="color-input"><input name="primary_color" type="color" defaultValue={values.primaryColor} /><code>{values.primaryColor}</code></span></label>
          <label>Secondary colour<span className="color-input"><input name="secondary_color" type="color" defaultValue={values.secondaryColor} /><code>{values.secondaryColor}</code></span></label>
          <label>Accent colour<span className="color-input"><input name="accent_color" type="color" defaultValue={values.accentColor} /><code>{values.accentColor}</code></span></label>
          <label>Pale colour<span className="color-input"><input name="pale_color" type="color" defaultValue={values.paleColor} /><code>{values.paleColor}</code></span></label>
          <label className="admin-span-two">Footer attribution<input name="footer_text" required defaultValue={values.footerText} /></label>
        </div>
        {values.logoUrl ? <img className="branding-logo-preview" src={values.logoUrl} alt="Current client logo" /> : null}
        <label className="check-row"><input type="checkbox" name="is_active" defaultChecked={editingPreset ? true : activeBrand?.isActive ?? false} /> Use this branding for learner-facing course pages</label>
        {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
        {state.success ? <p className="form-success" role="status">{state.success}</p> : null}
        <button className="primary-button" type="submit" disabled={pending}>{pending ? "Saving branding…" : editingPreset ? "Save branding changes" : "Save course branding"}</button>
      </form>
    </div>
  );
}
