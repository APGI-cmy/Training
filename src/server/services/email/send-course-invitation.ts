import "server-only";
import { createHash } from "node:crypto";
import {
  deliverTransactionalEmail,
  emailConfiguration,
} from "./transactional-delivery";
import { adminRest } from "@/server/supabase/admin-rest";
import { getSupabaseRestUrl } from "@/server/auth/session";
import { getCourseBySlug } from "@/lib/courses";
import { getCourseCover } from "@/lib/course-covers";
export type InvitationEmailInput = {
  invitationId: string;
  invitedRole?: "learner" | "admin" | "business_owner";
  recipientEmail: string;
  courseTitle: string;
  invitationToken: string;
  expiresAt: string;
  accountSetup?: boolean;
  actorId?: string|null;
};
export type InvitationEmailResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; error: "EMAIL_NOT_CONFIGURED" | "EMAIL_DELIVERY_FAILED" };
export function escapeEmail(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ] ?? c,
  );
}
export function isInvitationDeliveryConfigured() {
  return Boolean(emailConfiguration());
}
export function brandedEmail(input: {
  brand: string;
  logo?: string | null;
  color?: string;
  title: string;
  description: string;
  link: string;
  button: string;
  image?: string | null;
  footer: string;
}) {
  const e = escapeEmail,
    color = /^#[0-9a-f]{6}$/i.test(input.color ?? "")
      ? input.color!
      : "#102b49";
  return `<!doctype html><html><body style="margin:0;background:#edf3f7;font-family:Arial,sans-serif;color:#17324d"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="600" style="width:100%;max-width:600px;background:white;border-radius:12px;overflow:hidden" cellspacing="0" cellpadding="0"><tr><td style="padding:24px;background:${color};color:white">${input.logo ? `<img src="${e(input.logo)}" alt="${e(input.brand)}" width="150" style="display:block;max-height:70px;object-fit:contain;margin-bottom:12px">` : ""}<strong style="font-size:20px">${e(input.brand)}</strong></td></tr>${input.image ? `<tr><td><img src="${e(input.image)}" alt="Course illustration" width="600" style="display:block;width:100%;height:auto"></td></tr>` : ""}<tr><td style="padding:26px"><h1 style="font-size:25px;line-height:1.3;margin:0 0 16px">${e(input.title)}</h1><p style="line-height:1.6">${e(input.description)}</p><p style="margin:25px 0"><a href="${e(input.link)}" style="display:inline-block;background:${color};color:white;text-decoration:none;padding:14px 20px;border-radius:6px;font-weight:bold">${e(input.button)}</a></p><p style="font-size:13px;line-height:1.6">${e(input.footer)}</p><hr style="border:0;border-top:1px solid #d6e1e8"><p style="font-size:12px;color:#557084">Hosted by APGI. If you were not expecting this message, you can ignore it.</p></td></tr></table></td></tr></table></body></html>`;
}
export async function sendCourseInvitationEmail(
  input: InvitationEmailInput,
): Promise<InvitationEmailResult> {
  const config = emailConfiguration();
  if (!config) return { ok: false, error: "EMAIL_NOT_CONFIGURED" };
  const setup = input.accountSetup === true;
  const invitationUrl = new URL(
    setup ? `/register?token=${encodeURIComponent(input.invitationToken)}&setup=1` : `/invitations/${encodeURIComponent(input.invitationToken)}`,
    config.origin,
  ).toString();
  const expiry = new Date(input.expiresAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  });
  const admin = input.invitedRole === "admin",
    owner = input.invitedRole === "business_owner";
  let brand = "APGI Training",
    logo: string | null = null,
    color = "#102b49",
    courseId: string | null = null, organisationId:string|null=null;
  try {
    const r = await adminRest(
      `/rest/v1/course_invitations?id=eq.${input.invitationId}&select=organisation_id,course_id&limit=1`,
    );
    if (r.ok) {
      const row = (await r.json())[0];
      courseId = row?.course_id ?? null;
      organisationId=row?.organisation_id??null;
      if (row?.organisation_id && !admin) {
        const o = await adminRest(
          `/rest/v1/organisations?id=eq.${row.organisation_id}&is_active=eq.true&select=name,logo_path,primary_color&limit=1`,
        );
        if (o.ok) {
          const org = (await o.json())[0];
          if (org) {
            brand = org.name;
            color = org.primary_color;
            logo = org.logo_path
              ? getSupabaseRestUrl(
                  `/storage/v1/object/public/alp-branding-assets/${org.logo_path}`,
                )
              : null;
          }
        }
      }
    }
  } catch {
    /* Optional visuals fall back to APGI; the stored recipient and role never change. */
  }
  const title = setup ? "Choose your APGI V2 password and finish joining" : admin
    ? "Your APGI administrator invitation"
    : owner
      ? `Manage ${brand}`
      : input.courseTitle;
  const heading = setup ? "You requested help signing in. This email address has an active invitation, but its separate Version 2 account has not been created yet." : admin
    ? "You have been invited to join APGI Training as a platform administrator."
    : owner
      ? `You have been invited to manage the ${brand} company workspace.`
      : `You have been invited to enrol in ${input.courseTitle}.`;
  const instructions = setup ? "You do not need an existing password. Select Choose my password below, enter the email address that received this message, then choose and confirm your own password of at least 12 characters. We will email a confirmation link. Confirm your email, then complete and save Profile to activate only the access already assigned in your invitation. Your Version 1 account and password are separate and will not be changed. Never send your password to anyone." : admin
    ? "Sign in or create an account using this email address, then complete and save your profile. Your verified invitation will activate full administrator access in Version 2."
    : owner
      ? "Use this invited email, verify your account and save Profile. Manage only your company logo, colours, certificate design and assigned policies. This does not grant APGI platform administrator access."
      : "Use this invited email, verify your account and save Profile. Your invited course will appear on your dashboard automatically; no separate acceptance or approval is needed.";
  const button = setup ? "Choose my password" : admin
    ? "Open your administrator invitation"
    : owner
      ? "Open your company invitation"
      : "Open your course invitation";
  const cover = courseId ? getCourseCover(courseId) : null,
    course = courseId ? getCourseBySlug(courseId) : null;
  const html = brandedEmail({
    brand,
    logo,
    color,
    title,
    description: `${heading} ${setup ? "" : course?.description ?? ""} ${instructions}`,
    link: invitationUrl,
    button,
    image: !setup && cover ? new URL(cover.src, config.origin).toString() : null,
    footer: `This link expires ${expiry}. Administrator and owner rights require the matching verified account and a saved Profile.`,
  });
  return deliverTransactionalEmail({
    tracking:!admin&&!owner?false:{category:admin?'admin_invitation':'company_invitation',organisationId,sourceId:input.invitationId,actorId:input.actorId,messageKey:`invitation:${input.invitationId}`},
    to: input.recipientEmail,
    subject: setup ? "Set up your APGI Training V2 password" : admin
      ? "Your APGI administrator invitation"
      : owner
        ? `Your ${brand} company workspace invitation`
        : `Your ${brand} course invitation: ${input.courseTitle}`,
    html,
    text: `${brand}\n${heading}\n${button}: ${invitationUrl}\n\n${instructions}\nThis link expires ${expiry}. Hosted by APGI.`,
    idempotencyKey: `${setup ? "account-setup" : "course-invitation"}-${input.invitationId}-${createHash("sha256").update(input.invitationToken).digest("hex").slice(0, 20)}`,
  });
}
