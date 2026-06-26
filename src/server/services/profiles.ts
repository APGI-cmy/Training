import { getSupabaseRestUrl, type AlpSession } from "@/server/auth/session";

export type AlpProfile = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  preferred_name: string | null;
  certificate_name: string | null;
  phone: string | null;
  country: string | null;
  certificate_profile_locked_at: string | null;
};

export type AlpProfileFile = {
  id: string;
  owner_user_id: string;
  object_path: string;
  original_filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  file_purpose: "profile_photo" | "cv" | "assessment_evidence" | "certificate" | "other";
  created_at: string;
};

function headersFor(session: AlpSession, prefer = "return=representation") {
  return {
    apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    authorization: `Bearer ${session.accessToken}`,
    "content-type": "application/json",
    prefer
  };
}

export async function getProfile(session: AlpSession): Promise<AlpProfile | null> {
  const url = getSupabaseRestUrl(`/rest/v1/profiles?user_id=eq.${session.user.id}&select=*`);
  if (!url) return null;

  const response = await fetch(url, { headers: headersFor(session), cache: "no-store" });
  if (!response.ok) return null;

  const rows = (await response.json().catch(() => [])) as AlpProfile[];
  return rows[0] ?? null;
}

export async function upsertProfile(
  session: AlpSession,
  profile: Omit<AlpProfile, "user_id" | "email" | "certificate_profile_locked_at">
) {
  const url = getSupabaseRestUrl("/rest/v1/profiles?on_conflict=user_id");
  if (!url) return { ok: false, error: "Supabase REST environment is not configured." };

  const response = await fetch(url, {
    method: "POST",
    headers: headersFor(session, "resolution=merge-duplicates,return=representation"),
    body: JSON.stringify({ user_id: session.user.id, email: session.user.email ?? null, ...profile }),
    cache: "no-store"
  });

  if (!response.ok) return { ok: false, error: "Profile could not be saved." };
  return { ok: true };
}

export async function listProfileFiles(session: AlpSession) {
  const url = getSupabaseRestUrl(
    `/rest/v1/file_metadata?owner_user_id=eq.${session.user.id}&select=*&order=created_at.desc`
  );
  if (!url) return [];

  const response = await fetch(url, { headers: headersFor(session), cache: "no-store" });
  if (!response.ok) return [];

  return (await response.json().catch(() => [])) as AlpProfileFile[];
}

export async function insertProfileFileMetadata(
  session: AlpSession,
  file: {
    objectPath: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    filePurpose: "profile_photo" | "cv";
  }
) {
  const url = getSupabaseRestUrl("/rest/v1/file_metadata");
  if (!url) return { ok: false, error: "Supabase REST environment is not configured." };

  const response = await fetch(url, {
    method: "POST",
    headers: headersFor(session),
    body: JSON.stringify({
      owner_user_id: session.user.id,
      profile_user_id: session.user.id,
      bucket_id: process.env.PRIVATE_FILE_BUCKET ?? "alp-private-files",
      object_path: file.objectPath,
      original_filename: file.originalFilename,
      mime_type: file.mimeType,
      size_bytes: file.sizeBytes,
      file_purpose: file.filePurpose,
      visibility: "private"
    }),
    cache: "no-store"
  });

  if (!response.ok) return { ok: false, error: "File metadata could not be saved." };
  return { ok: true };
}
