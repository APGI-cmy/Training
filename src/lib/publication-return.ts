import { getCourseBySlug } from "./courses";
export function publicationReturnPath(value: unknown): string | null {
  if (value === "/admin/agreements") return value;
  if (typeof value !== "string") return null;
  if(/^\/course-reviews\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))return value;
  const start=/^\/course-reviews\/new\?course=([a-z0-9-]+)$/.exec(value);
  if(start&&getCourseBySlug(start[1]))return value;
  const match = /^\/admin\/courses\/([a-z0-9-]+)\/publish$/.exec(value);
  return match && getCourseBySlug(match[1]) ? value : null;
}
