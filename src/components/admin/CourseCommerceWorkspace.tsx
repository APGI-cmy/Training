"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCourses } from "@/lib/courses";
import { DEFAULT_TAX_NOTICE, type CourseCommerceSetting, type CoursePaymentRecipient } from "@/lib/commerce";
import { deactivateCoursePaymentRecipient, saveCourseCommerceSettings, saveCoursePaymentRecipient, type CommerceFormState } from "@/server/actions/commerce/manage-course-commerce";

const initialState: CommerceFormState = {};
const payoutLabel = { per_transaction: "Each settled transaction", transaction_threshold: "After a transaction count", monthly: "Monthly" } as const;

export function CourseCommerceWorkspace({ courseId, settings, recipients }: { courseId: string; settings: CourseCommerceSetting; recipients: CoursePaymentRecipient[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCourse = searchParams.get("course") ?? courseId;
  const [pricingState, pricingAction, pricingPending] = useActionState(saveCourseCommerceSettings, initialState);
  const [recipientState, recipientAction, recipientPending] = useActionState(saveCoursePaymentRecipient, initialState);
  const [removalState, setRemovalState] = useState<CommerceFormState>({});
  const [removing, startRemoval] = useTransition();

  useEffect(() => { if (pricingState.success || recipientState.success || removalState.success) router.refresh(); }, [pricingState.success, recipientState.success, removalState.success, router]);
  const allocation = recipients.filter((recipient) => recipient.isActive).reduce((total, recipient) => total + recipient.revenueShareBps, 0) / 100;

  return <main className="admin-page commerce-page">
    <header className="admin-page-header"><div><p className="eyebrow">Commerce</p><h1>Course payments and recipients</h1><p>Set prices, prepare recipient allocation rules and review the payment audit trail. Card checkout remains disabled until Stripe Connect is configured and tested.</p></div></header>
    <label className="course-selector">Course<select value={selectedCourse} onChange={(event) => router.push(`/admin/payments?course=${event.target.value}`)}>{getCourses().map((course) => <option key={course.slug} value={course.slug}>{course.title}</option>)}</select></label>
    <section className="admin-workspace-grid">
      <form action={pricingAction} className="admin-form-card">
        <input type="hidden" name="course_id" value={selectedCourse} />
        <div className="admin-card-heading"><div><p className="eyebrow">Course price</p><h2>Catalogue settings</h2></div></div>
        <div className="admin-form-grid"><label>Price<input name="price" type="number" min="0" step="0.01" defaultValue={(settings.priceCents / 100).toFixed(2)} required /></label><label>Currency<select name="currency" defaultValue={settings.currency}>{["USD", "CAD", "EUR", "GBP", "ZAR"].map((currency) => <option key={currency}>{currency}</option>)}</select></label><label>Tax treatment<select name="tax_treatment" defaultValue={settings.taxTreatment}><option value="not_collected">Not collected by APGI</option><option value="inclusive">Included in course price</option><option value="exclusive">Added at checkout</option></select></label><label className="admin-span-two">Buyer notice<textarea name="tax_notice" defaultValue={settings.taxNotice || DEFAULT_TAX_NOTICE} required /></label></div>
        {pricingState.error ? <p className="form-error">{pricingState.error}</p> : null}{pricingState.success ? <p className="form-success">{pricingState.success}</p> : null}<button className="primary-button" disabled={pricingPending}>{pricingPending ? "Saving…" : "Save course price"}</button>
      </form>
      <section className="admin-side-card"><p className="eyebrow">Allocation summary</p><h2>{allocation.toFixed(2)}% assigned</h2><p>{(100 - allocation).toFixed(2)}% remains with the platform before any future Stripe processing fees, refunds or disputes.</p><p className="field-hint">Recipient percentages must never exceed 100% for a course.</p></section>
    </section>
    <section className="admin-workspace-grid">
      <form action={recipientAction} className="admin-form-card">
        <input type="hidden" name="course_id" value={selectedCourse} /><input type="hidden" name="recipient_id" value="" />
        <div className="admin-card-heading"><div><p className="eyebrow">Revenue recipient</p><h2>Add recipient</h2></div><p>Bank details are collected later through Stripe Connect onboarding, never in APGI.</p></div>
        <div className="admin-form-grid"><label>Recipient name<input name="display_name" required placeholder="Example: Course author" /></label><label>Recipient email<input name="recipient_email" type="email" placeholder="recipient@example.com" /></label><label>Country code<input name="country_code" maxLength={2} placeholder="CA" /></label><label>Allocation percentage<input name="revenue_share_percent" type="number" min="0" max="100" step="0.01" required /></label><label>Payout timing<select name="payout_rule" defaultValue="per_transaction">{Object.entries(payoutLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Transaction count <span className="field-hint">Only for “After a transaction count”.</span><input name="transaction_threshold" type="number" min="2" max="250" placeholder="10" /></label></div>
        {recipientState.error ? <p className="form-error">{recipientState.error}</p> : null}{recipientState.success ? <p className="form-success">{recipientState.success}</p> : null}<button className="primary-button" disabled={recipientPending}>{recipientPending ? "Saving…" : "Add recipient"}</button>
      </form>
      <section className="admin-side-card"><p className="eyebrow">Audit readiness</p><h2>Nothing paid yet</h2><p>Once Stripe is enabled, every order, allocation, transfer, payout, refund and dispute will appear here with course and recipient filters.</p></section>
    </section>
    <section className="admin-form-card"><div className="admin-card-heading"><div><p className="eyebrow">Recipients</p><h2>Current allocation rules</h2></div></div>
      {recipients.length ? <div className="commerce-recipient-list">{recipients.map((recipient) => <article key={recipient.id} className="commerce-recipient"><div><strong>{recipient.displayName}</strong><span>{(recipient.revenueShareBps / 100).toFixed(2)}% · {payoutLabel[recipient.payoutRule]}{recipient.transactionThreshold ? ` (${recipient.transactionThreshold})` : ""}</span><span>{recipient.stripeConnectedAccountId ? `Stripe: ${recipient.onboardingStatus}` : "Stripe onboarding not started"}</span></div><button className="text-button" disabled={removing || !recipient.isActive} type="button" onClick={() => startRemoval(async () => { const result = await deactivateCoursePaymentRecipient({ courseId: selectedCourse, recipientId: recipient.id }); setRemovalState(result); })}>{recipient.isActive ? "Remove" : "Removed"}</button></article>)}</div> : <p>No payment recipients have been added for this course.</p>}
      {removalState.error ? <p className="form-error">{removalState.error}</p> : null}{removalState.success ? <p className="form-success">{removalState.success}</p> : null}
    </section>
  </main>;
}
