import "server-only";

export type InvitationEmailInput = {
  invitationId: string;
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

function getAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (!appUrl) return null;

  try {
    const parsed = new URL(appUrl);
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isInvitationDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim() && getAppUrl());
}

export async function sendCourseInvitationEmail(input: InvitationEmailInput): Promise<InvitationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const appUrl = getAppUrl();

  if (!apiKey || !from || !appUrl) return { ok: false, error: "EMAIL_NOT_CONFIGURED" };
  if (/[\r\n]/.test(from) || /[\r\n]/.test(input.recipientEmail)) return { ok: false, error: "EMAIL_DELIVERY_FAILED" };

  const invitationUrl = new URL(`/invitations/${encodeURIComponent(input.invitationToken)}`, appUrl).toString();
  const expiry = new Date(input.expiresAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });
  const courseTitle = escapeHtml(input.courseTitle);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "idempotency-key": `course-invitation-${input.invitationId}`
      },
      body: JSON.stringify({
        from,
        to: [input.recipientEmail],
        subject: `Your APGI course invitation: ${input.courseTitle}`,
        html: `<p>You have been invited to enrol in <strong>${courseTitle}</strong>.</p><p><a href="${invitationUrl}">Accept your course invitation</a></p><p>This single-use link expires ${escapeHtml(expiry)}. You must sign in or create an APGI account using this email address.</p><p>If you were not expecting this invitation, you can ignore this email.</p>`,
        text: `You have been invited to enrol in ${input.courseTitle}. Accept your course invitation: ${invitationUrl}\n\nThis single-use link expires ${expiry}. You must sign in or create an APGI account using this email address.`
      }),
      cache: "no-store"
    });

    if (!response.ok) return { ok: false, error: "EMAIL_DELIVERY_FAILED" };
    const payload = (await response.json().catch(() => ({}))) as { id?: string };
    return { ok: true, providerMessageId: payload.id ?? null };
  } catch {
    return { ok: false, error: "EMAIL_DELIVERY_FAILED" };
  }
}
