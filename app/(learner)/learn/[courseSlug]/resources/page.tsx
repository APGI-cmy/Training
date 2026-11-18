import { notFound } from "next/navigation";
import { COPYRIGHT_TERMS, COPYRIGHT_TERMS_VERSION, SCANNEX_COURSE_ID } from "@/lib/course-benefits";
import { requireScannexLearner } from "@/server/services/course-benefits";
import { getCourseBook } from "@/server/services/course-books";
import { getProfile } from "@/server/services/profiles";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scannex e-book download", robots: { index: false, follow: false } };

export default async function ResourcePage({ params, searchParams }: {
  params: Promise<{ courseSlug: string }>; searchParams: Promise<{ book?: string }>;
}) {
  if ((await params).courseSlug !== SCANNEX_COURSE_ID) notFound();
  const session = await requireScannexLearner();
  const [book, profile] = await Promise.all([getCourseBook((await searchParams).book ?? "full"), getProfile(session)]);
  if (!book) notFound();
  const name = profile?.certificate_name?.trim() || profile?.full_name?.trim();
  return <main className="content-band"><div className="content-inner benefit-page">
    <a className="back-link" href={`/learn/${SCANNEX_COURSE_ID}`}>Back to course</a>
    <p className="eyebrow">Personal learner reference copy</p><h1>Download your e-book</h1>
    <h2>{book.title}</h2><p>{book.pages} pages · {(book.bytes / 1048576).toFixed(1)} MB · PDF</p>
    <section className="unit-card"><h2>Copyright acknowledgement</h2><p>{COPYRIGHT_TERMS}</p>
      <p>Your signed-in learner account, entered name, document version and file fingerprint, accepted wording and time of the authorised download will be recorded. This is an electronic acknowledgement, not a hand-drawn signature.</p>
      {name ? <form method="post" action={`/learn/${SCANNEX_COURSE_ID}/resources/download`} className="benefit-form">
        <input type="hidden" name="book" value={book.id}/><input type="hidden" name="termsVersion" value={COPYRIGHT_TERMS_VERSION}/>
        <label>Type your full name exactly as shown: <strong>{name}</strong><input name="signature" autoComplete="name" required minLength={2} maxLength={180}/></label>
        <label className="benefit-check"><input type="checkbox" name="agree" required/>I agree to APGI’s copyright and personal-use terms above.</label>
        <button type="submit" className="primary-button">Agree, sign and download PDF</button>
      </form> : <p><a href="/profile">Complete your full name in your profile</a> before signing.</p>}
      <p><small>You can keep your copy for reference. Permission to redistribute must be obtained from APGI in writing.</small></p>
    </section>
  </div></main>;
}
