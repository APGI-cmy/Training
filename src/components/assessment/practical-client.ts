import { PRACTICAL_API, type PracticalFile } from "@/lib/assessments/scannex-assignment";
export async function practicalRequest<T = unknown>(path = "", data?: unknown): Promise<T> {
  const response = await fetch(`${PRACTICAL_API}${path}`, { method: data ? "POST" : "GET", cache: "no-store", headers: data ? { "content-type": "application/json" } : undefined, body: data ? JSON.stringify(data) : undefined });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The action could not be confirmed.");
  return result as T;
}
export async function uploadPracticalFile(file: File, fields: Record<string, unknown>, status: (s: string) => void): Promise<PracticalFile> {
  status("Preparing private upload…");
  const reserved = await practicalRequest<{ file: PracticalFile; uploadUrl: string }>("/uploads", { operation: "reserve", ...fields, name: file.name, mime: file.type || (file.name.match(/\.(tif|tiff)$/i) ? "image/tiff" : "text/plain"), size: file.size });
  status("Uploading evidence… Keep this page open.");
  const response = await fetch(reserved.uploadUrl, { method: "PUT", headers: { "content-type": reserved.file.mime_type, "x-upsert": "false" }, body: file });
  if (!response.ok) throw new Error("Upload did not finish. Your worksheet is unchanged; please retry the file.");
  status("Verifying file size, type and SHA-256…");
  const sealed = await practicalRequest<{ file: PracticalFile }>("/uploads", { operation: "finalize", id: reserved.file.id });
  status("Evidence verified and saved privately."); return sealed.file;
}
