import "server-only";

// Preview emails stay on their own immutable deployment, never the live portal.
export function getApplicationUrl(): URL | null {
  const preview = process.env.VERCEL_ENV === "preview";
  const previewHost = process.env.VERCEL_URL?.trim();
  if (preview && (!previewHost || !/^[a-z0-9.-]+\.vercel\.app$/i.test(previewHost))) return null;
  const value = preview ? `https://${previewHost}` : process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return null;
    if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) return null;
    return url;
  } catch {
    return null;
  }
}
