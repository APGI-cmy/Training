import { Readable } from "node:stream";
import { createHash, randomUUID } from "node:crypto";
import { getCurrentSession } from "@/server/auth/session";
import { getCourseAccess } from "@/lib/services/enrolments/get-course-access";
import { COPYRIGHT_TERMS, COPYRIGHT_TERMS_VERSION, SCANNEX_COURSE_ID, validSignature } from "@/lib/course-benefits";
import { getCourseBook, loadCourseBookBytes } from "@/server/services/course-books";
import { getProfile } from "@/server/services/profiles";
import { writeBenefitEvent } from "@/server/services/course-benefits";

const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow", Vary: "Cookie" };
function error(message: string, status: number) { return new Response(message, { status, headers: privateHeaders }); }
export async function POST(request: Request, context: { params: Promise<{ courseSlug: string }> }) {
  if ((await context.params).courseSlug !== SCANNEX_COURSE_ID) return error("Not found", 404);
  // Next may expose an internal hostname in Request.url. Match the browser's
  // Origin against the routed Host (as Server Actions do), not that internal URL.
  const url = new URL(request.url);
  const expectedOrigin = `${url.protocol}//${request.headers.get("host") ?? url.host}`;
  if (request.headers.get("origin") !== expectedOrigin) return error("Please download from your signed-in course page.", 403);
  if (Number(request.headers.get("content-length") ?? 0) > 8192) return error("Request too large", 413);
  const session = await getCurrentSession();
  if (!session) return error("Please sign in again, then return to the e-book download page.", 401);
  const access = await getCourseAccess({ accessToken: session.accessToken, userId: session.user.id, courseId: SCANNEX_COURSE_ID });
  if (!access.canAccess) return error("An active Scannex enrolment is required.", 403);
  try {
    const form = await request.formData();
    if (form.get("agree") !== "on" || form.get("termsVersion") !== COPYRIGHT_TERMS_VERSION) return error("Please accept the current copyright terms on the download page.", 400);
    const [book, profile] = await Promise.all([getCourseBook(String(form.get("book") ?? "")), getProfile(session)]);
    if (!book) return error("E-book not found.", 404);
    const expectedName = profile?.certificate_name?.trim() || profile?.full_name?.trim() || "";
    const signature = form.get("signature");
    if (!validSignature(signature, expectedName)) return error("Please return to the download page and enter your full name exactly as shown.", 400);
    const bytes = await loadCourseBookBytes(book);
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (hash !== book.sha256) throw new Error("BOOK_INTEGRITY_FAILED");
    const requestId = randomUUID();
    await writeBenefitEvent(session.user.id, "ebook_download_authorised", {
      requestId, courseId: SCANNEX_COURSE_ID, bookId: book.id, documentVersion: book.version, filename: book.filename, sha256: hash,
      email: session.user.email ?? null, signature, profileName: expectedName, termsVersion: COPYRIGHT_TERMS_VERSION,
      terms: COPYRIGHT_TERMS, termsSha256: createHash("sha256").update(COPYRIGHT_TERMS).digest("hex")
    });
    // Stream the full book: buffered responses exceed the hosting payload limit.
    const chunks = function* () { for (let offset = 0; offset < bytes.length; offset += 65536) yield bytes.subarray(offset, offset + 65536); };
    const stream = Readable.toWeb(Readable.from(chunks())) as ReadableStream<Uint8Array>;
    return new Response(stream, { headers: { ...privateHeaders, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="APGI-Scannex-${book.id}.pdf"`, "X-APGI-Download-Reference": requestId } });
  } catch (caught) {
    console.error("V1 e-book download failed", caught instanceof Error && caught.message === "BOOK_INTEGRITY_FAILED" ? "integrity" : "audit-or-resource-unavailable");
    return error("The signed download could not be recorded safely. Please return to the course page and try again or contact APGI.", 503);
  }
}
