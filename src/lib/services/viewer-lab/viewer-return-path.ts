/** Only accept an actual learning page in this course, never an external URL. */
export function viewerReturnPath(courseSlug: string, candidate?: string): string | null {
  if (!candidate || candidate.includes("\\") || /[\r\n]/.test(candidate)) return null;
  const root = `/learn/${encodeURIComponent(courseSlug)}`;
  if (candidate === root) return candidate;
  const path = candidate.split(/[?#]/, 1)[0];
  return new RegExp(`^${root}/units/lu[1-9](?:/scorm)?$`).test(path) ? candidate : null;
}
