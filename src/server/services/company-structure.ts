import "server-only";
import { cookies } from "next/headers";
import {
  requireSession,
  getUserRoles,
  type AlpSession,
} from "@/server/auth/session";
import { adminRest } from "@/server/supabase/admin-rest";
import { isPlatformPrincipal } from "./platform-principals";
import {
  validId,
  type CompanyRecord,
  type OfferingRecord,
  type PolicyRecord,
} from "@/lib/company-structure";
const companyFields =
  "id,slug,name,logo_path,primary_color,secondary_color,accent_color,pale_color,footer_text,certificate_template_id,contact_email,brand_revision,is_active";
export async function rows<T>(path: string): Promise<T[]> {
  const r = await adminRest(path);
  if (!r.ok)
    throw new Error("Records are temporarily unavailable. Please try again.");
  return r.json();
}
export async function write(path: string, body: unknown, method = "POST") {
  const r = await adminRest(path, {
    method,
    headers: {
      Prefer: `${path.includes("on_conflict=") ? "resolution=merge-duplicates," : ""}return=representation`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok)
    throw new Error(
      "The change could not be saved. Check the details and try again.",
    );
  return r.json();
}
export async function companyActor(session?: AlpSession) {
  const s = session ?? (await requireSession());
  if (!s.user.email_confirmed_at)
    throw new Error("Verify your email before opening a company workspace.");
  return {
    session: s,
    isAdmin: (await getUserRoles(s.accessToken)).includes("admin"),
  };
}
export async function ownMemberships(session: AlpSession, ownerOnly = false) {
  return rows<{ organisation_id: string; membership_role: string }>(
    `/rest/v1/organisation_memberships?user_id=eq.${session.user.id}&is_active=eq.true${ownerOnly ? "&membership_role=eq.owner" : ""}&select=organisation_id,membership_role`,
  );
}
export async function accessibleCompanies(
  session?: AlpSession,
  ownerOnly = false,
) {
  const actor = await companyActor(session);
  let scope = "";
  if (!actor.isAdmin) {
    const ids = [
      ...new Set(
        (await ownMemberships(actor.session, ownerOnly)).map(
          (m) => m.organisation_id,
        ),
      ),
    ];
    if (!ids.length) return [];
    scope = `&id=in.(${ids.join(",")})`;
  }
  return rows<CompanyRecord>(
    `/rest/v1/organisations?is_active=eq.true${scope}&select=${companyFields}&order=name.asc`,
  );
}
export async function requireCompany(id: string, ownerOnly = true) {
  const actor = await companyActor();
  validId(id);
  if (
    !actor.isAdmin &&
    !(await ownMemberships(actor.session, ownerOnly)).some(
      (m) => m.organisation_id === id,
    )
  )
    throw new Error("You do not have access to this company.");
  const company = (
    await rows<CompanyRecord>(
      `/rest/v1/organisations?id=eq.${id}&is_active=eq.true&select=${companyFields}&limit=1`,
    )
  )[0];
  if (!company) throw new Error("This company is unavailable.");
  if (ownerOnly && !actor.isAdmin && company.slug === "apgi")
    throw new Error("APGI settings require platform administrator access.");
  return { ...actor, company };
}
export async function companyOfferings(id: string) {
  await requireCompany(id, false);
  return rows<OfferingRecord>(
    `/rest/v1/organisation_offerings?organisation_id=eq.${id}&select=id,organisation_id,course_id,status&order=created_at.asc`,
  );
}
export async function listPolicies() {
  const actor = await companyActor();
  const principal = await isPlatformPrincipal(actor.session);
  let filter = principal ? "" : "&visibility=eq.company";
  if (!actor.isAdmin) {
    if (!actor.session.user.email_confirmed_at) return [];
    const memberships = await ownMemberships(actor.session, true);
    const assignments = await rows<{ policy_id: string }>(
      `/rest/v1/policy_reviewers?email=eq.${encodeURIComponent(actor.session.user.email?.toLowerCase() ?? "")}&select=policy_id`,
    );
    const clauses = [];
    if (memberships.length)
      clauses.push(
        `organisation_id.in.(${memberships.map((m) => m.organisation_id).join(",")})`,
      );
    if (assignments.length)
      clauses.push(`id.in.(${assignments.map((m) => m.policy_id).join(",")})`);
    if (!clauses.length) return [];
    filter += `&or=(${clauses.join(",")})`;
  }
  const policies = await rows<PolicyRecord>(
    `/rest/v1/platform_policy_versions?select=*${filter}&order=created_at.desc&limit=100`,
  );
  if (actor.isAdmin) return policies;
  const revoked = await rows<{ organisation_id: string }>(
    `/rest/v1/organisation_memberships?user_id=eq.${actor.session.user.id}&membership_role=eq.owner&is_active=eq.false&select=organisation_id`,
  );
  return policies.filter(
    (p) => !revoked.some((m) => m.organisation_id === p.organisation_id),
  );
}
export async function requirePolicy(id: string) {
  const actor = await companyActor();
  validId(id);
  const metadata = (
    await rows<{ organisation_id: string | null; visibility: "internal" | "company" }>(
      `/rest/v1/platform_policy_versions?id=eq.${id}&select=organisation_id,visibility&limit=1`,
    )
  )[0];
  if (!metadata || !["internal", "company"].includes(metadata.visibility))
    throw new Error("You do not have access to this policy.");
  if (metadata.visibility === "internal" && !(await isPlatformPrincipal(actor.session)))
    throw new Error("You do not have access to this policy.");
  if (!actor.isAdmin) {
    const owner = metadata.organisation_id
      ? (await ownMemberships(actor.session, true)).some(
          (m) => m.organisation_id === metadata.organisation_id,
        )
      : false;
    if (metadata.organisation_id) {
      const revoked = await rows<{ organisation_id: string }>(
        `/rest/v1/organisation_memberships?user_id=eq.${actor.session.user.id}&organisation_id=eq.${metadata.organisation_id}&membership_role=eq.owner&is_active=eq.false&select=organisation_id`,
      );
      if (revoked.length)
        throw new Error("You do not have access to this policy.");
    }
    if (!owner) {
      const assigned = await rows<{ policy_id: string }>(
        `/rest/v1/policy_reviewers?policy_id=eq.${id}&email=eq.${encodeURIComponent(actor.session.user.email?.toLowerCase() ?? "")}&select=policy_id`,
      );
      if (!assigned.length)
        throw new Error("You do not have access to this policy.");
    }
  }
  const policy = (
    await rows<PolicyRecord>(
      `/rest/v1/platform_policy_versions?id=eq.${id}&select=*&limit=1`,
    )
  )[0];
  if (!policy) throw new Error("Policy not found.");
  return { ...actor, policy };
}
export async function companyAudit(
  actorId: string,
  organisationId: string | null,
  subjectId: string,
  event: string,
  detail: object = {},
) {
  await write("/rest/v1/governance_events", {
    actor_id: actorId,
    organisation_id: organisationId,
    subject_id: subjectId,
    event_type: event,
    detail,
  });
}
export async function contextualCompany(
  session: AlpSession,
  courseId?: string,
  requestedId?: string,
) {
  const actor = await companyActor(session);
  if (courseId) {
    const enrolment = (
      await rows<{ organisation_id: string }>(
        `/rest/v1/course_enrolments?user_id=eq.${session.user.id}&course_id=eq.${encodeURIComponent(courseId)}&status=eq.enrolled&select=organisation_id&limit=1`,
      )
    )[0];
    if (enrolment?.organisation_id)
      return (
        (
          await rows<CompanyRecord>(
            `/rest/v1/organisations?id=eq.${enrolment.organisation_id}&is_active=eq.true&select=${companyFields}`,
          )
        )[0] ?? null
      );
  }
  const chosen =
    requestedId ?? (await cookies()).get("alp_company_context")?.value;
  if (!chosen) return null;
  validId(chosen);
  if (
    !actor.isAdmin &&
    !(await ownMemberships(session)).some((m) => m.organisation_id === chosen)
  )
    return null;
  return (
    (
      await rows<CompanyRecord>(
        `/rest/v1/organisations?id=eq.${chosen}&is_active=eq.true&select=${companyFields}`,
      )
    )[0] ?? null
  );
}
