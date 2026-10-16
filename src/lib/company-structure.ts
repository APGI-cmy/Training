export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const policySignatories = [
  "johan.ras@apginc.ca",
  "jorrie.jordaan@apginc.ca",
] as const;
export function validId(id: string) {
  if (!uuidPattern.test(id))
    throw new Error("Choose a valid company or record.");
  return id;
}
export function companySlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
export function formText(form: FormData, key: string, min = 0, max = 5000) {
  const v = String(form.get(key) ?? "").trim();
  if (v.length < min || v.length > max)
    throw new Error(`Check ${key.replaceAll("_", " ")}.`);
  return v;
}
export type CompanyRecord = {
  id: string;
  slug: string;
  name: string;
  logo_path: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  pale_color: string;
  footer_text: string;
  certificate_template_id: string;
  contact_email: string | null;
  brand_revision: number;
  is_active: boolean;
};
export type OfferingRecord = {
  id: string;
  organisation_id: string;
  course_id: string;
  status: "draft" | "published" | "archived";
};
export type PolicyRecord = {
  id: string;
  visibility: "internal" | "company";
  title: string;
  organisation_id: string | null;
  version_label: string;
  body: string;
  content_hash: string;
  file_path: string | null;
  file_sha256: string | null;
  status: "draft" | "submitted" | "approved" | "rejected";
  created_at: string;
  created_by: string;
  previous_version_id: string | null;
};
export type DraftRecord = {
  id: string;
  organisation_id: string | null;
  course_id: string | null;
  title: string;
  kind: "course_agreement" | "operating_cost" | "internal_distribution";
  configuration: Record<string, string | null>;
  created_at: string;
  status: "draft";
};
export type StructureState = {
  error?: string;
  success?: string;
  link?: string;
};
export const financialDraftFields = [
  "currency",
  "rights_holder",
  "development_funder",
  "development_cost",
  "already_paid",
  "recovery_rate",
  "post_recovery_share",
  "course_owner_share",
  "seller_share",
  "cost_supplier",
  "cost_period",
  "cost_amount",
  "cost_allocation_basis",
  "administration_rate",
  "johan_share",
  "jorrie_share",
  "calculation_basis",
  "notes",
] as const;
export function financialDraftConfiguration(form: FormData) {
  const result: Record<string, string | null> = {};
  for (const field of financialDraftFields) {
    const raw = formText(form, field, 0, field === "notes" ? 5000 : 250);
    result[field] = raw || null;
    if (
      raw &&
      (field.endsWith("_rate") ||
        [
          "course_owner_share",
          "seller_share",
          "johan_share",
          "jorrie_share",
          "post_recovery_share",
        ].includes(field))
    ) {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 100)
        throw new Error("Percentages must be between 0 and 100.");
    }
    if (
      raw &&
      ["development_cost", "already_paid", "cost_amount"].includes(field) &&
      (!/^\d+(\.\d{1,2})?$/.test(raw) || Number(raw) > 1e10)
    )
      throw new Error("Enter a valid non-negative monetary amount.");
  }
  if (result.currency && !/^[A-Z]{3}$/.test(result.currency))
    throw new Error("Use a three-letter uppercase currency code.");
  return result;
}
