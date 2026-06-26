"use server";

import { revalidatePath } from "next/cache";
import { requireSession, getSupabaseRestUrl } from "@/server/auth/session";
import { insertProfileFileMetadata } from "@/server/services/profiles";

export type FileUploadState = {
  error?: string;
  success?: string;
};

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export async function uploadProfileFileAction(
  _state: FileUploadState,
  formData: FormData
): Promise<FileUploadState> {
  const session = await requireSession();
  const file = formData.get("profile_file");
  const purpose = String(formData.get("file_purpose") ?? "cv") === "profile_photo" ? "profile_photo" : "cv";

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a profile photo or CV file to upload." };
  }

  const bucket = process.env.PRIVATE_FILE_BUCKET ?? "alp-private-files";
  const objectPath = `${session.user.id}/profile/${Date.now()}-${safeFileName(file.name)}`;
  const uploadUrl = getSupabaseRestUrl(`/storage/v1/object/${bucket}/${objectPath}`);

  if (!uploadUrl) {
    return { error: "Supabase storage environment is not configured." };
  }

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      authorization: `Bearer ${session.accessToken}`,
      "content-type": file.type || "application/octet-stream",
      "x-upsert": "true"
    },
    body: file,
    cache: "no-store"
  });

  if (!response.ok) {
    return { error: "Private file upload failed." };
  }

  const metadataResult = await insertProfileFileMetadata(session, {
    objectPath,
    originalFilename: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    filePurpose: purpose
  });

  if (!metadataResult.ok) {
    return { error: metadataResult.error };
  }

  revalidatePath("/profile");
  return { success: "Private profile file uploaded." };
}
