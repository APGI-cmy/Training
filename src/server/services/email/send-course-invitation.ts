import "server-only";
import { createHash } from "node:crypto";
import { deliverTransactionalEmail, emailConfiguration } from "./transactional-delivery";

export type InvitationEmailInput = {
  invitationId: string;
  invitedRole?: "learner" | "admin";
  recipientEmail: string;
  courseTitle: string;
  invitationToken: string;
  expiresAt: string;
};

export type InvitationEmailResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; error: "EMAIL_NOT_CONFIGURED" | "EMAIL_DELIVERY_FAILED" };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character] ?? character);
}

export function isInvitationDeliveryConfigured() { return Boolean(emailConfiguration()); }

export async function sendCourseInvitationEmail(input: InvitationEmailInput): Promise<InvitationEmailResult> {
  const config=emailConfiguration();
  if(!config)return {ok:false,error:"EMAIL_NOT_CONFIGURED"};
  const invitationUrl=new URL(`/invitations/${encodeURIComponent(input.invitationToken)}`,config.origin).toString();
  const expiry=new Date(input.expiresAt).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"Africa/Johannesburg"});
  const admin=input.invitedRole==='admin';
  const heading=admin?'You have been invited to join APGI Training as a platform administrator.':`You have been invited to enrol in ${input.courseTitle}.`;
  const instructions=admin?'Sign in or create an account using this email address, then complete and save your profile. Your verified invitation will activate full administrator access in Version 2.':'Sign in or create an APGI account using this email address, then complete and save your learner profile. Your invited course will appear on your dashboard automatically; no separate acceptance or approval is needed.';
  const label=admin?'Open your administrator invitation':'Open your course invitation';
  return deliverTransactionalEmail({to:input.recipientEmail,subject:admin?'Your APGI administrator invitation':`Your APGI course invitation: ${input.courseTitle}`,html:`<p>${escapeHtml(heading)}</p><p><a href="${escapeHtml(invitationUrl)}">${label}</a></p><p>This link expires ${escapeHtml(expiry)}.</p><p>${instructions}</p><p>If you were not expecting this invitation, you can ignore it. ${admin ? "Administrator rights are granted only after the matching email account is verified and Profile is saved." : ""}</p>`,text:`${heading} ${label}: ${invitationUrl}\n\nThis link expires ${expiry}. ${instructions}`,idempotencyKey:`course-invitation-${input.invitationId}-${createHash('sha256').update(input.invitationToken).digest('hex').slice(0,20)}`});
}
