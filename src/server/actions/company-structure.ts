"use server";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { requirePlatformPrincipal } from "@/server/services/platform-principals";
import { publicationReturnPath } from "@/lib/publication-return";
import { requireSession, getSupabaseRestUrl } from "@/server/auth/session";
import { getCourseBySlug } from "@/lib/courses";
import { isBrandColor } from "@/lib/branding";
import { isDesign } from "@/lib/certificates/designs";
import {
  formText,
  companySlug,
  validId,
  emailPattern,
  type StructureState,
} from "@/lib/company-structure";
import {
  rows,
  write,
  requireCompany,
  companyAudit,
} from "@/server/services/company-structure";
import { deliverStoredInvitation } from "@/server/services/invitations/deliver-stored-invitation";
import { adminRest } from "@/server/supabase/admin-rest";
async function ownerInvitation(
  actorId: string,
  companyId: string,
  email: string,
) {
  if (!emailPattern.test(email)) throw new Error("Enter a valid owner email.");
  const company = (
    await rows<{ slug: string }>(
      `/rest/v1/organisations?id=eq.${companyId}&select=slug&limit=1`,
    )
  )[0];
  if (!company || company.slug === "apgi")
    throw new Error(
      "APGI is managed by platform administrators; appoint business owners to partner companies.",
    );
  const pending = await rows<{ id: string }>(
    `/rest/v1/course_invitations?organisation_id=eq.${companyId}&recipient_email=eq.${encodeURIComponent(email)}&invited_role=eq.business_owner&status=in.(pending,sent)&revoked_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id`,
  );
  if (pending.length)
    throw new Error(
      "An active owner invitation already exists. Use Invitations to resend it.",
    );
  const token = randomBytes(32).toString("base64url"),
    id = randomUUID(),
    expires = new Date(Date.now() + 7 * 86400000).toISOString();
  await write("/rest/v1/course_invitations", {
    id,
    recipient_email: email,
    course_id: null,
    invited_role: "business_owner",
    organisation_id: companyId,
    basis: "internal_allocation",
    reason: "Company owner onboarding",
    expires_at: expires,
    created_by: actorId,
    token_hash: createHash("sha256").update(token).digest("hex"),
  });
  await write("/rest/v1/course_invitation_events", {
    invitation_id: id,
    event_type: "created",
    actor_id: actorId,
    metadata: { invited_role: "business_owner" },
  });
  const result = await deliverStoredInvitation({
    id,
    recipientEmail: email,
    role: "business_owner",
    courseTitle: "Company workspace",
    token,
    expiresAt: expires,
    actorId,
  });
  if (!result.ok)
    throw new Error(
      "Company saved, but the owner email was not confirmed. Open Invitations to retry.",
    );
  return result.invitationUrl;
}
export async function companyStructureAction(
  _state: StructureState,
  form: FormData,
): Promise<StructureState> {
  await requireSession();
  const op = String(form.get("operation") ?? "");
  try {
    if (op === "create") {
      const { session } = await requireAdmin();
      const name = formText(form, "name", 2, 120),
        slug = companySlug(name);
      if (!slug) throw new Error("Enter a valid company name.");
      const owner = formText(form, "owner_email", 0, 254).toLowerCase();
      if (owner && !emailPattern.test(owner))
        throw new Error("Enter a valid owner email.");
      const id = randomUUID();
      await write("/rest/v1/organisations", {
        id,
        name,
        slug,
        default_referral_share_bps: 0,
        footer_text: "Hosted by APGI",
      });
      await companyAudit(session.user.id, id, id, "company_created");
      let link: string | undefined;
      if (owner) link = await ownerInvitation(session.user.id, id, owner);
      revalidatePath("/admin/companies");
      revalidatePath("/admin/organisations");
      const returnTo = publicationReturnPath(formText(form, "return_to"));
      if (returnTo) redirect(`/company/${id}?returnTo=${encodeURIComponent(returnTo)}`);
      return {
        success: `${name} created. Commercial terms remain unconfigured.${owner ? " Owner invitation prepared." : ""}`,
        link,
      };
    }
    const id = validId(formText(form, "organisation_id", 36, 36));
    const access = await requireCompany(id);
    if (op === "brand") {
      const name = formText(form, "name", 2, 120),
        contact = formText(form, "contact_email", 0, 254);
      if (contact && !emailPattern.test(contact))
        throw new Error("Check the support email.");
      const template = formText(form, "certificate_template_id");
      if (!isDesign(template))
        throw new Error("Choose an approved certificate design.");
      const palette = Object.fromEntries(
        ["primary_color", "secondary_color", "accent_color", "pale_color"].map(
          (k) => {
            const v = formText(form, k);
            if (!isBrandColor(v))
              throw new Error("Use six-digit colour values.");
            return [k, v];
          },
        ),
      );
      let logo = access.company.logo_path;
      const file = form.get("logo");
      if (file instanceof File && file.size) {
        if (
          file.size > 2 * 1024 * 1024 ||
          !["image/png", "image/jpeg", "image/webp"].includes(file.type)
        )
          throw new Error("Use a PNG, JPEG or WebP logo up to 2 MB.");
        const sharp = (await import("sharp")).default;
        const bytes = await sharp(Buffer.from(await file.arrayBuffer()), {
          limitInputPixels: 16000000,
        })
          .resize({
            width: 1200,
            height: 1200,
            fit: "inside",
            withoutEnlargement: true,
          })
          .png()
          .toBuffer();
        logo = `organisations/${id}/${randomUUID()}.png`;
        const r = await fetch(
          getSupabaseRestUrl(`/storage/v1/object/alp-branding-assets/${logo}`)!,
          {
            method: "POST",
            headers: {
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
              authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              "content-type": "image/png",
            },
            body: new Uint8Array(bytes),
            cache: "no-store",
          },
        );
        if (!r.ok) throw new Error("Logo upload failed.");
      }
      const updated = await write(
        `/rest/v1/organisations?id=eq.${id}&brand_revision=eq.${access.company.brand_revision}`,
        {
          name,
          contact_email: contact || null,
          logo_path: logo,
          ...palette,
          certificate_template_id: template,
          footer_text: "Hosted by APGI",
          brand_revision: access.company.brand_revision + 1,
        },
        "PATCH",
      );
      if (!updated.length)
        throw new Error(
          "This brand was changed by another person. Refresh and review the latest version before saving.",
        );
      await companyAudit(
        access.session.user.id,
        id,
        id,
        "company_brand_updated",
        { template },
      );
    } else if (op === "offering") {
      if (!access.isAdmin)
        throw new Error("Only APGI administrators can assign courses.");
      await requirePlatformPrincipal();
      const course = formText(form, "course_id"),
        status = formText(form, "status");
      if (
        !getCourseBySlug(course) ||
        !["draft", "published", "archived"].includes(status)
      )
        throw new Error("Choose a valid course and status.");
      if (status === "published")
        throw new Error("Publish through Course reviews and publication after the exact release has passed review. This menu cannot bypass that approval.");
      await write(
        "/rest/v1/organisation_offerings?on_conflict=organisation_id,course_id",
        {
          organisation_id: id,
          course_id: course,
          status,
          created_by: access.session.user.id,
        },
        "POST",
      );
      await companyAudit(access.session.user.id, id, id, "offering_saved", {
        course,
        status,
      });
    } else if (op === "invite_owner") {
      if (!access.isAdmin)
        throw new Error("Only APGI administrators can appoint owners.");
      const link = await ownerInvitation(
        access.session.user.id,
        id,
        formText(form, "owner_email", 3, 254).toLowerCase(),
      );
      revalidatePath("/admin/invitations");
      return { success: "Company-owner invitation prepared.", link };
    } else if (op === "revoke_owner") {
      if (!access.isAdmin)
        throw new Error("Only APGI administrators can revoke owners.");
      const user = validId(formText(form, "user_id", 36, 36));
      await write(
        `/rest/v1/organisation_memberships?organisation_id=eq.${id}&user_id=eq.${user}&membership_role=eq.owner`,
        { is_active: false },
        "PATCH",
      );
      const identity = await adminRest(`/auth/v1/admin/users/${user}`);
      if (!identity.ok)
        throw new Error(
          "Owner access was revoked; invitation cleanup needs administrator review.",
        );
      const identityData = (await identity.json()) as { email?: string };
      if (identityData.email)
        await write(
          `/rest/v1/course_invitations?organisation_id=eq.${id}&recipient_email=eq.${encodeURIComponent(identityData.email.toLowerCase())}&invited_role=eq.business_owner&status=in.(pending,sent)`,
          { status: "revoked", revoked_at: new Date().toISOString() },
          "PATCH",
        );
      await companyAudit(access.session.user.id, id, user, "owner_revoked");
    } else if (op === "request") {
      await write("/rest/v1/company_change_requests", {
        organisation_id: id,
        requested_by: access.session.user.id,
        subject: formText(form, "subject", 3, 150),
        description: formText(form, "description", 10, 5000),
      });
    } else if (op === "respond") {
      if (!access.isAdmin)
        throw new Error("Only APGI administrators can respond.");
      const req = validId(formText(form, "request_id", 36, 36));
      const status = formText(form, "status");
      if (!["reviewing", "completed", "declined"].includes(status))
        throw new Error("Choose a valid status.");
      await write(
        `/rest/v1/company_change_requests?id=eq.${req}&organisation_id=eq.${id}`,
        { status, response: formText(form, "response", 3, 5000) },
        "PATCH",
      );
    } else throw new Error("Choose a valid action.");
    revalidatePath("/admin/companies");
    revalidatePath(`/company/${id}`);
    revalidatePath("/admin/certificates");
    revalidatePath("/admin/invitations");
    const returnTo = publicationReturnPath(formText(form, "return_to"));
    if(op==="brand"&&returnTo){
      if(returnTo.startsWith("/course-reviews/new?")){await requirePlatformPrincipal();redirect(`${returnTo}&brand=${encodeURIComponent(id)}`);}
      if(returnTo.startsWith("/course-reviews/")){const {requireReview}=await import("@/server/services/course-reviews");const review=await requireReview(returnTo.split("/").at(-1)!);if(review.round.organisation_id!==id)throw Error("Return to this company's review only.");redirect(returnTo);}
      if(access.isAdmin){await requirePlatformPrincipal();redirect(`${returnTo}?brand=${encodeURIComponent(id)}`);}
    }
    return { success: "Saved. Financial arrangements remain drafts." };
  } catch (error) {
    if (error instanceof Error && "digest" in error) throw error;
    return {
      error:
        error instanceof Error
          ? error.message
          : "The change could not be saved.",
    };
  }
}
export async function switchCompany(form: FormData) {
  const id = validId(formText(form, "organisation_id", 36, 36));
  await requireCompany(id, false);
  (await cookies()).set("alp_company_context", id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 28800,
  });
  redirect(`/company/${id}`);
}
