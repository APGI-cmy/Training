import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { validBookId } from "@/lib/course-benefits";
import { adminRest } from "@/server/supabase/admin-rest";

export type CourseBook = { id: string; title: string; filename: string; pages: number; bytes: number; sha256: string };
const directory = join(process.cwd(), "private", "course-books", "scannex");
export async function getCourseBook(id: string): Promise<(CourseBook & { storagePath: string; version: string }) | null> {
  if (!validBookId(id)) return null;
  const manifest = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8")) as { version: string; resources: CourseBook[] };
  const book = manifest.resources.find(row => row.id === id);
  if (!book || !/^[a-z0-9-]+\.pdf$/.test(book.filename)) return null;
  if (!/^[a-z0-9-]+$/.test(manifest.version)) throw new Error("INVALID_BOOK_VERSION");
  return { ...book, storagePath: `v1-scannex-course-books/${manifest.version}/${book.filename}`, version: manifest.version };
}

export async function loadCourseBookBytes(book: CourseBook & { storagePath: string }): Promise<Buffer> {
  const response = await adminRest(`/storage/v1/object/authenticated/${book.storagePath}`, { method: "GET" });
  if (!response.ok) throw new Error("BOOK_STORAGE_UNAVAILABLE");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length !== book.bytes) throw new Error("BOOK_INTEGRITY_FAILED");
  return bytes;
}
