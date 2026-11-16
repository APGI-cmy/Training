// Opt-in fictional QA in the isolated V2 database. No real email or payout.
import { beforeAll, describe, it, expect, vi } from "vitest";
import nextEnv from "@next/env";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
const fixture = vi.hoisted(() => ({ session: null as any }));
vi.mock("@/server/auth/session", async (original) => ({
  ...(await original<any>()),
  requireSession: vi.fn(() => fixture.session),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { adminRest } from "@/server/supabase/admin-rest";
import { assertStagingIsolation } from "@/server/environment-isolation";
import {
  requireCompany,
  listPolicies,
} from "@/server/services/company-structure";
import { companyStructureAction } from "@/server/actions/company-structure";
import { policyStructureAction } from "@/server/actions/platform-policies";
let actor: string,
  org: string,
  other: string,
  owner: any,
  outsider: any,
  invite: string,
  policy: string;
async function rest(path: string, body?: unknown, method = "POST") {
  const r = await adminRest(
    path,
    body
      ? {
          method,
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(body),
        }
      : {},
  );
  if (!r.ok) throw new Error(`Fixture ${r.status}: ${path}: ${await r.text()}`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}
async function account(label: string) {
  const email = `qa-company-${label}-${Date.now()}@example.invalid`,
    password = randomBytes(32).toString("base64url");
  const u = await rest("/auth/v1/admin/users", {
    email,
    password,
    email_confirm: true,
  });
  const r = await fetch(
    process.env.NEXT_PUBLIC_SUPABASE_URL + "/auth/v1/token?grant_type=password",
    {
      method: "POST",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    },
  );
  if (!r.ok) throw new Error("Fixture sign-in failed");
  const t = await r.json();
  await rest("/rest/v1/profiles", {
    user_id: u.id,
    email,
    certificate_name: "Fictional company QA",
  });
  return { user: u, accessToken: t.access_token };
}
async function rpc(fn: string, body: object) {
  return adminRest("/rest/v1/rpc/" + fn, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
function form(op: string, id = org) {
  const f = new FormData();
  f.set("operation", op);
  f.set("organisation_id", id);
  return f;
}
async function policyFixture(previous?: string) {
  const id = randomUUID();
  await rest("/rest/v1/platform_policy_versions", {
    id,
    title: `QA Company policy ${id}`,
    version_label: "test 1",
    body: "Fictional policy for isolated integration QA only.",
    content_hash: createHash("sha256").update(id).digest("hex"),
    organisation_id: org,
    visibility: "company",
    created_by: actor,
    previous_version_id: previous ?? null,
  });
  await rest(
    "/rest/v1/policy_reviewers",
    [...[owner, outsider].map((u) => ({ policy_id: id, email: u.user.email })),
      { policy_id: id, email: "johan.ras@apginc.ca" }],
  );
  return id;
}
beforeAll(async () => {
  const mode = process.env.NODE_ENV;
  vi.stubEnv("NODE_ENV", "development");
  nextEnv.loadEnvConfig(process.cwd(), true);
  vi.stubEnv("NODE_ENV", mode);
  vi.stubEnv("ALP_EMAIL_MODE", "disabled");
  assertStagingIsolation();
  actor = (await rest("/auth/v1/admin/users?page=1&per_page=100")).users.find(
    (u: any) => u.email === "johan.ras@apginc.ca",
  ).id;
  owner = await account("owner");
  outsider = await account("outsider");
  for (const label of ["Alpha", "Beta"]) {
    const row = (
      await rest("/rest/v1/organisations", {
        name: `QA Company ${label} ${Date.now()}`,
        slug: `qa-company-${label.toLowerCase()}-${Date.now()}`,
        default_referral_share_bps: 0,
      })
    )[0];
    if (label === "Alpha") org = row.id;
    else other = row.id;
  }
  invite = (
    await rest("/rest/v1/course_invitations", {
      recipient_email: owner.user.email,
      invited_role: "business_owner",
      course_id: null,
      organisation_id: org,
      basis: "internal_allocation",
      reason: "Fictional owner QA",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      token_hash: randomBytes(32).toString("hex"),
      created_by: actor,
    })
  )[0].id;
  fixture.session = owner;
});
describe("V2 company structure integration", () => {
  it("rejects a mismatched mailbox before granting company ownership", async () => {
    const r = await rpc("v2_redeem_owner_invitation", {
      p_invitation: invite,
      p_user: outsider.user.id,
    });
    expect(r.ok).toBe(false);
  });
  it("redeems a company-owner invitation once, without adding any global administrator role", async () => {
    for (let n = 0; n < 2; n++) {
      const r = await rpc("v2_redeem_owner_invitation", {
        p_invitation: invite,
        p_user: owner.user.id,
      });
      expect(r.ok).toBe(true);
      expect(await r.json()).toBe(org);
    }
    expect(
      await rest(
        `/rest/v1/user_roles?user_id=eq.${owner.user.id}&role=eq.admin&select=id`,
      ),
    ).toEqual([]);
    expect(
      await rest(
        `/rest/v1/organisation_memberships?user_id=eq.${owner.user.id}&membership_role=eq.owner&select=organisation_id`,
      ),
    ).toHaveLength(1);
  });
  it("allows own-company branding and certificate selection but ignores forged finance fields", async () => {
    fixture.session = owner;
    const f = form("brand");
    for (const [k, v] of Object.entries({
      name: `QA Company Alpha Updated ${Date.now()}`,
      contact_email: "support@example.invalid",
      certificate_template_id: "horizon",
      primary_color: "#143245",
      secondary_color: "#287d8e",
      accent_color: "#aa9933",
      pale_color: "#ddeeff",
      default_referral_share_bps: "9900",
      is_active: "false",
    }))
      f.set(k, v);
    expect(await companyStructureAction({}, f)).toMatchObject({
      success: expect.any(String),
    });
    const row = (
      await rest(
        `/rest/v1/organisations?id=eq.${org}&select=certificate_template_id,default_referral_share_bps,is_active`,
      )
    )[0];
    expect(row).toMatchObject({
      certificate_template_id: "horizon",
      default_referral_share_bps: 0,
      is_active: true,
    });
  });
  it("denies another company and denies owner course assignment", async () => {
    await expect(requireCompany(other)).rejects.toThrow("access");
    const f = form("offering");
    f.set("course_id", "scannex-training-programme");
    f.set("status", "published");
    expect(await companyStructureAction({}, f)).toMatchObject({
      error: expect.stringContaining("Only APGI"),
    });
  });
  it("creates a company-scoped change request without modifying any course", async () => {
    const f = form("request");
    f.set("subject", "Fictional request");
    f.set(
      "description",
      "Please review this fictional request for a future layout.",
    );
    expect(await companyStructureAction({}, f)).toMatchObject({
      success: expect.any(String),
    });
    expect(
      await rest(
        `/rest/v1/company_change_requests?organisation_id=eq.${org}&select=id`,
      ),
    ).toHaveLength(1);
  });
  it("prevents a later invitation or concurrent writer from moving an active course enrolment to another company", async () => {
    await rest("/rest/v1/learners?on_conflict=id", {
      id: owner.user.id,
      status: "active",
    });
    await rest("/rest/v1/course_enrolments", {
      user_id: owner.user.id,
      course_id: "scannex-training-programme",
      organisation_id: org,
      status: "enrolled",
      source: "admin",
    });
    const moved = await adminRest(
      `/rest/v1/course_enrolments?user_id=eq.${owner.user.id}`,
      { method: "PATCH", body: JSON.stringify({ organisation_id: other }) },
    );
    expect(moved.ok).toBe(false);
    expect(await moved.text()).toContain(
      "ENROLMENT_COMPANY_TRANSFER_REQUIRES_REVIEW",
    );
  });
  it("locks a submitted policy, requires designated decisions and retains rejection", async () => {
    policy = await policyFixture();
    const submit = await rpc("v2_policy_review", {
      p_policy: policy,
      p_actor: actor,
      p_action: "submit",
    });
    expect(submit.ok).toBe(true);
    const edit = await adminRest(
      `/rest/v1/platform_policy_versions?id=eq.${policy}`,
      {
        method: "PATCH",
        body: JSON.stringify({ body: "A changed submitted policy body." }),
      },
    );
    expect(edit.ok).toBe(false);
    const addReviewer = await adminRest("/rest/v1/policy_reviewers", {
      method: "POST",
      body: JSON.stringify({
        policy_id: policy,
        email: "not-in-original@example.invalid",
      }),
    });
    expect(addReviewer.ok).toBe(false);
    fixture.session = owner;
    const a = new FormData();
    a.set("operation", "approve");
    a.set("confirm_decision", "on");
    a.set("policy_id", policy);
    expect(await policyStructureAction({}, a)).toMatchObject({
      success: expect.stringContaining("submitted"),
    });
    expect(
      (
        await rpc("v2_policy_review", {
          p_policy: policy,
          p_actor: owner.user.id,
          p_action: "approve",
        })
      ).ok,
    ).toBe(false);
    fixture.session = outsider;
    const rejected = new FormData();
    rejected.set("operation", "reject");
    rejected.set("confirm_decision", "on");
    rejected.set("policy_id", policy);
    rejected.set("reason", "Revise the fictional allocation.");
    expect(await policyStructureAction({}, rejected)).toMatchObject({
      success: expect.stringContaining("rejected"),
    });
    expect(
      (
        await rpc("v2_policy_review", {
          p_policy: policy,
          p_actor: owner.user.id,
          p_action: "approve",
        })
      ).ok,
    ).toBe(false);
  });
  it("uses fresh decisions on a revised version, without activating any money", async () => {
    const revised = await policyFixture(policy);
    expect(
      (
        await rpc("v2_policy_review", {
          p_policy: revised,
          p_actor: actor,
          p_action: "submit",
        })
      ).ok,
    ).toBe(true);
    for (const user of [owner, outsider])
      expect(
        (
          await rpc("v2_policy_review", {
            p_policy: revised,
            p_actor: user.user.id,
            p_action: "approve",
          })
        ).ok,
      ).toBe(true);
    expect((await rpc("v2_policy_review", { p_policy: revised, p_actor: actor, p_action: "approve" })).ok).toBe(true);
    expect(
      (
        await rest(
          `/rest/v1/platform_policy_versions?id=eq.${revised}&select=status`,
        )
      )[0].status,
    ).toBe("approved");
    expect(
      await rest(
        `/rest/v1/policy_decisions?policy_id=eq.${revised}&select=email`,
      ),
    ).toHaveLength(3);
    const bad = await adminRest("/rest/v1/commercial_agreement_drafts", {
      method: "POST",
      body: JSON.stringify({
        title: "Invalid activation",
        kind: "internal_distribution",
        created_by: actor,
        status: "active",
      }),
    });
    expect(bad.ok).toBe(false);
  });
  it("blocks ordinary and anonymous direct access to policies, finances, storage and privileged RPCs", async () => {
    const filed = (
      await rest(
        "/rest/v1/platform_policy_versions?file_path=not.is.null&select=file_path&limit=1",
      )
    )[0];
    const publicHeaders = {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    };
    for (const headers of [
      publicHeaders,
      { ...publicHeaders, authorization: `Bearer ${owner.accessToken}` },
    ]) {
      if (filed) {
        const file = await fetch(
          process.env.NEXT_PUBLIC_SUPABASE_URL +
            "/storage/v1/object/authenticated/apgi-policy-documents/" +
            filed.file_path,
          { headers },
        );
        expect(file.ok).toBe(false);
      }
      for (const table of [
        "platform_policy_versions",
        "commercial_agreement_drafts",
        "policy_decisions",
        "organisation_offerings",
      ]) {
        const r = await fetch(
          process.env.NEXT_PUBLIC_SUPABASE_URL + `/rest/v1/${table}?select=*`,
          { headers },
        );
        expect(r.ok).toBe(false);
      }
      expect(
        (
          await fetch(
            process.env.NEXT_PUBLIC_SUPABASE_URL +
              "/rest/v1/rpc/v2_redeem_owner_invitation",
            {
              method: "POST",
              headers: { ...headers, "content-type": "application/json" },
              body: JSON.stringify({
                p_invitation: invite,
                p_user: owner.user.id,
              }),
            },
          )
        ).ok,
      ).toBe(false);
    }
    fixture.session = owner;
    const visible = await listPolicies();
    expect(visible.every((p) => p.organisation_id === org)).toBe(true);
    await writeFile(
      ".vercel/company-structure-qa.json",
      JSON.stringify(
        {
          fictional: true,
          organisation: org,
          otherOrganisation: other,
          owner: owner.user.id,
          outsider: outsider.user.id,
          policy,
          tests: 10,
          noRealEmail: true,
        },
        null,
        2,
      ),
    );
  });
  it("removes a revoked owner's policy access even when that email remains in an immutable review history", async () => {
    await rest(
      `/rest/v1/organisation_memberships?organisation_id=eq.${org}&user_id=eq.${owner.user.id}&membership_role=eq.owner`,
      { is_active: false },
      "PATCH",
    );
    fixture.session = owner;
    await expect(requireCompany(org)).rejects.toThrow("access");
    expect((await listPolicies()).some((p) => p.organisation_id === org)).toBe(
      false,
    );
  });
});
