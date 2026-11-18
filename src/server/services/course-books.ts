import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { validBookId } from "@/lib/course-benefits";

export type CourseBook = { id: string; title: string; filename: string; pages: number; bytes: number; sha256: string };
const directory = join(process.cwd(), "private", "course-books", "scannex");
export async function getCourseBook(id: string): Promise<(CourseBook & { path: string }) | null> {
  if (!validBookId(id)) return null;
  const manifest = JSON.parse(await readFile(join(directory, "manifest.json"), "utf8")) as { resources: CourseBook[] };
  const book = manifest.resources.find(row => row.id === id);
  if (!book || !/^[a-z0-9-]+\.pdf$/.test(book.filename)) return null;
  return { ...book, path: join(directory, book.filename) };
}
