import Link from "next/link";
import { privacyNotice } from "@/lib/privacy-notice";

export function PrivacyPolicyCard() {
  return (
    <section className="admin-form-card" aria-labelledby="privacy-policy-heading">
      <h2 id="privacy-policy-heading">{privacyNotice.title}</h2>
      <p>Available to every user, including before sign-in. The training-specific privacy notice explains how APGI handles learner, company and review information, who may receive it, and how to request access, correction or deletion.</p>
      <p>Linked edition: version {privacyNotice.version} · Effective {privacyNotice.effectiveDate} · {privacyNotice.reference}.</p>
      <p><a className="primary-button" href={privacyNotice.url} target="_blank" rel="noopener noreferrer">Read the privacy policy (opens a new tab)</a></p>
      <p><Link href="/privacy#privacy-contacts">Privacy contacts and company-portal responsibilities</Link></p>
      <p>This is a published privacy notice. Reading it does not record a policy approval or opt you into marketing.</p>
    </section>
  );
}
