import "server-only";
import { createHash } from "node:crypto";
import { getClassroomPack } from "@/lib/namdeb-classroom";
import { getApplicationUrl } from "@/server/services/application-url";

export type InvitationEmailInput = {
  invitationId: string;
  recipientEmail: string;
  courseTitle: string;
  invitationToken: string;
  expiresAt: string;
  classroomPack?: string;
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

export function isInvitationDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim() && getApplicationUrl());
}

export async function sendCourseInvitationEmail(input: InvitationEmailInput): Promise<InvitationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const appUrl = getApplicationUrl();

  if (!apiKey || !from || !appUrl) return { ok: false, error: "EMAIL_NOT_CONFIGURED" };
  if (/[\r\n]/.test(from) || /[\r\n]/.test(input.recipientEmail)) return { ok: false, error: "EMAIL_DELIVERY_FAILED" };

  const invitationUrl = new URL(`/invitations/${encodeURIComponent(input.invitationToken)}`, appUrl).toString();
  const expiry = new Date(input.expiresAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" });
  const courseTitle = escapeHtml(input.courseTitle);

  try {
    const pack = getClassroomPack(input.classroomPack);
    if (input.classroomPack && !pack) return { ok: false, error: "EMAIL_DELIVERY_FAILED" };
    const attachments = [];
    for (const file of pack?.attachments ?? []) {
      const resource = await fetch(new URL(file.path, appUrl), { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20_000) });
      if (!resource.ok || Number(resource.headers.get("content-length") ?? 0) > 2_000_000) throw new Error("Classroom attachment unavailable");
      const bytes = Buffer.from(await resource.arrayBuffer());
      if (bytes.length > 2_000_000 || bytes.subarray(0, 5).toString() !== "%PDF-" || createHash("sha256").update(bytes).digest("hex") !== file.sha256) throw new Error("Classroom attachment verification failed");
      attachments.push({ filename: file.filename, content: bytes.toString("base64"), content_type: "application/pdf" });
    }
    const support = "If you experience any problems, contact Johan Ras at johan.ras@apginc.ca.";
    const classroomHtml = pack ? `<h2>Your classroom training</h2><ul><li><strong>Dates:</strong> ${pack.dates}</li><li><strong>Hours:</strong> 08:00–16:30 (UTC+02:00). Arrive at 07:45 on the first day.</li><li><strong>Site:</strong> Oranjemund. Classroom: to be advised.</li><li><strong>Presenter:</strong> Johan Ras, APGI.</li></ul><h2>Attached documents — please read both</h2><ol><li><strong>${pack.attachments[0].filename}</strong> — your group’s learner information, equipment and preparation.</li><li><strong>${pack.attachments[1].filename}</strong> — the two-day block programme.</li></ol><h2>Prepare before the course</h2><p>Bring your laptop/computer, charger and headphones. You need reliable internet for the online learning material and live Scannex Viewer. Open your invitation and complete account setup before arrival.</p><h2>Assessments</h2><p>The theory assessment is completed on the platform. During the week beginning 16 November 2026, APGI will send a separate practical assignment explaining what evidence to submit, how to submit it and its deadline. Johan Ras will personally evaluate and mark that evidence. Attendance or the theory result alone does not constitute final competency.</p>` : "";
    const classroomText = pack ? `\n\nCLASSROOM TRAINING\nDates: ${pack.dates}\nHours: 08:00–16:30 (UTC+02:00); first-day arrival 07:45.\nSite: Oranjemund; classroom to be advised. Presenter: Johan Ras, APGI.\n\nATTACHMENTS\n1. ${pack.attachments[0].filename}: group information and preparation.\n2. ${pack.attachments[1].filename}: two-day block programme.\nBring a laptop/computer, charger and headphones; reliable internet is required for the live Scannex Viewer.\n\nASSESSMENTS\nComplete the theory assessment on the platform. APGI will issue the practical assignment during the week beginning 16 November 2026, with submission instructions and a deadline. Johan Ras will personally evaluate the evidence. Attendance or theory alone is not final competency.` : "";
    const accountHtml = `<h2>Open your learning account</h2><ol><li><a href="${invitationUrl}">Open your course invitation</a>.</li><li>Sign in or create an APGI account using this email address. For a new account, choose a password of at least 12 characters and follow the account-confirmation email.</li><li>Complete and save your learner profile. The invited course will appear on your dashboard automatically.</li></ol><p>If you already have an account and cannot sign in, use <a href="${new URL("/forgot-password", appUrl)}">Forgot password</a>. Check junk/spam for account emails.</p><p><strong>Invitation link expiry:</strong> ${escapeHtml(expiry)} (UTC+02:00). This is the deadline to use this invitation, not your course-access expiry.</p>`;
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
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#122c45;max-width:720px;margin:auto"><img src="${new URL("/branding/apgi-logo.png", appUrl)}" width="180" alt="APGI"/><h1>${courseTitle}</h1><p>You have been invited to enrol in <strong>${courseTitle}</strong>.</p>${classroomHtml}${accountHtml}<p>${support}</p><p><a href="https://legal.apgi.app/privacy">Privacy notice</a></p><p>If you were not expecting this invitation, you can ignore this email.</p></div>`,
        text: `You have been invited to enrol in ${input.courseTitle}.${classroomText}\n\nOPEN YOUR LEARNING ACCOUNT\n1. Open your course invitation: ${invitationUrl}\n2. Sign in or create an APGI account using this email address. For a new account, use at least 12 password characters and follow the confirmation email.\n3. Complete and save your learner profile; the course then appears automatically.\nForgot password: ${new URL("/forgot-password", appUrl)}\nCheck junk/spam for account emails.\nInvitation link expires ${expiry} (UTC+02:00); this is not your course-access expiry.\n\n${support}\nPrivacy: https://legal.apgi.app/privacy`,
        ...(attachments.length ? { attachments } : {})
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
