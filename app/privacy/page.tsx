import type { Metadata } from "next";
import { PrivacyPolicyCard } from "@/components/policies/PrivacyPolicyCard";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <main className="admin-page">
      <header className="admin-page-header"><div><p className="eyebrow">Policies and your information</p><h1>Privacy and your information</h1><p>You can read the privacy policy without creating an account or signing in.</p></div></header>
      <PrivacyPolicyCard />
      <section className="admin-form-card">
        <h2 id="privacy-contacts">Questions or requests about your information</h2>
        <p>Contact <a href="mailto:jorrie.jordaan@apginc.ca?subject=APGI%20Training%20privacy%20request">Adriaan (Jorrie) Jordaan</a>, or <a href="mailto:johan.ras@apginc.ca?subject=APGI%20Training%20privacy%20request">Johan Ras</a>. Include the service and company involved. Do not send passwords, card details or unnecessary identity documents.</p>
        <h2>Company portals</h2>
        <p>If your organisation provides access to training, its own privacy notice and agreement may also apply. The APGI Training notice does not replace the organisation’s responsibility to explain its independent use of your information.</p>
        <h2>Choices and policy changes</h2>
        <p>Optional marketing choices are separate from essential account and course communications. The privacy centre identifies the current notice and describes how material changes will be communicated. This page does not infer acceptance, consent or approval from silence.</p>
      </section>
    </main>
  );
}
