import { getCourseBySlug } from "./courses";
export function publicationReturnPath(value: unknown): string | null {
  if (value === "/admin/agreements") return value;
  if (typeof value !== "string") return null;
  const match = /^\/admin\/courses\/([a-z0-9-]+)\/publish$/.exec(value);
  return match && getCourseBySlug(match[1]) ? value : null;
}
