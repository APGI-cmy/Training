export type CoursePreview = {
  scope: string;
  courseHref: string;
  unitBaseHref: string;
  returnHref: string;
  returnLabel: string;
};

export type PreviewProgress = {
  opened: string[];
  completed: string[];
  attempts: Record<string, Record<string, string>>;
};

export const emptyPreviewProgress = (): PreviewProgress => ({ opened: [], completed: [], attempts: {} });
export const previewStorageKey = (scope: string) => `apgi-course-preview-v1:${scope}`;

export function parsePreviewProgress(raw: string | null): PreviewProgress {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value || !Array.isArray(value.opened) || !Array.isArray(value.completed) || !value.attempts || typeof value.attempts !== "object") return emptyPreviewProgress();
    return {
      opened: value.opened.filter((id: unknown) => typeof id === "string"),
      completed: value.completed.filter((id: unknown) => typeof id === "string"),
      attempts: Object.fromEntries(Object.entries(value.attempts).filter(([, attempt]) => attempt && typeof attempt === "object" && !Array.isArray(attempt) && Object.values(attempt).every(v => typeof v === "string"))) as PreviewProgress["attempts"]
    };
  } catch { return emptyPreviewProgress(); }
}

export function previewUnitHref(preview: CoursePreview, slug: string) {
  return `${preview.unitBaseHref}/${slug}`;
}
