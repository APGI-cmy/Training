import { notFound } from "next/navigation";
import { certificateWording, SCANNEX_COURSE_ID } from "@/lib/course-benefits";
import { getOwnedCertificate, requireScannexLearner } from "@/server/services/course-benefits";
import { CertificatePrintButton } from "@/components/course/CertificatePrintButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "APGI course certificate", robots: { index: false, follow: false } };

export default async function CertificatePage({ params }: { params: Promise<{ courseSlug: string; certificateId: string }> }) {
  const { courseSlug, certificateId } = await params;
  if (courseSlug !== SCANNEX_COURSE_ID) notFound();
  const session = await requireScannexLearner();
  const certificate = await getOwnedCertificate(session.user.id, certificateId);
  if (!certificate) notFound();
  return <main className="certificate-page">
    <div className="certificate-controls"><a href={`/learn/${SCANNEX_COURSE_ID}`}>Back to course</a></div>
    <article className={`apgi-certificate certificate-${certificate.kind}`}>
      <p className="certificate-brand">APGI</p><p className="eyebrow">Scannex Training Programme</p>
      <h1>Certificate of {certificate.kind === "passed" ? "Achievement" : "Attendance"}</h1>
      <p>This certifies that</p><h2>{certificate.learner_name}</h2>
      <p className="certificate-statement">{certificateWording(certificate.kind)}</p>
      <p>Issued by APGI on {new Date(certificate.issued_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg" })}</p>
      <footer><p>Certificate reference: {certificate.id}</p><p>Issued against APGI’s recorded course assessment decision.</p></footer>
    </article>
    <CertificatePrintButton id={certificate.id}/>
  </main>;
}
