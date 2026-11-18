import { SCANNEX_COURSE_ID, retryMessage } from "@/lib/course-benefits";
import { getBenefitState } from "@/server/services/course-benefits";
import { CourseBenefitForm } from "./CourseBenefitForm";

export async function CourseBenefits({ userId }: { userId: string }) {
  const state = await getBenefitState(userId).catch(() => null);
  const base = `/learn/${SCANNEX_COURSE_ID}`;
  return <section className="content-band"><div className="content-inner benefit-grid">
    <article className="unit-card"><p className="eyebrow">Keep your learning reference</p><h2>Your Scannex e-books</h2>
      <p>Download the complete book, or a single learning unit from its course card. Sign APGI’s personal-use copyright acknowledgement before each download.</p>
      <a className="primary-button" href={`${base}/resources?book=full`}>Download complete e-book</a>
    </article>
    <article className="unit-card"><p className="eyebrow">Results, certificates and next steps</p><h2>Your course outcome</h2>
      {!state ? <p role="status">Verified results are temporarily unavailable. No certificate eligibility has been assumed. Please retry or contact APGI.</p> : <>
        <p>Course attempt {state.attemptNumber}. A pass requires completed learning and a verified theory and practical assessment result. Opening pages is not a pass.</p>
        {state.certificates.map(c => <p key={c.id}><a className="secondary-button" href={`${base}/certificates/${c.id}`}>Open {c.kind === "passed" ? "achievement" : "attendance"} certificate</a></p>)}
        {state.passed ? <><p>Congratulations — you have successfully met the course pass requirements.</p>
          {!state.certificates.some(c => c.kind === "passed") ? <CourseBenefitForm><input type="hidden" name="operation" value="certificate"/><input type="hidden" name="kind" value="passed"/><button className="primary-button">Prepare achievement certificate</button></CourseBenefitForm> : null}</> : null}
        {state.failed && !state.passed ? <>
          <p>{retryMessage(state.attemptNumber)}</p>
          {state.attendanceEligible && !state.certificates.some(c => c.kind === "attendance") ? <CourseBenefitForm><input type="hidden" name="operation" value="certificate"/><input type="hidden" name="kind" value="attendance"/><button className="secondary-button">Prepare attendance certificate</button></CourseBenefitForm> : null}
          {state.attemptNumber === 1 || state.request?.status === "approved" ? <CourseBenefitForm>
            <input type="hidden" name="operation" value="redo"/><input type="hidden" name="attempt" value={state.attemptNumber}/>
            <p>Close other course tabs first. Your current learning and activity state will be archived, then reset. Earlier marks, evidence and certificates will remain on record.</p>
            <label className="benefit-check"><input type="checkbox" name="acknowledge" required/>I am ready to start a new course attempt.</label>
            <button className="primary-button">{state.attemptNumber === 1 ? "Start my included redo" : "Start APGI-approved next attempt"}</button>
          </CourseBenefitForm> : state.request ? <p>APGI request: {state.request.status}. {state.request.review_note ?? "Please await APGI’s review."}</p> : <CourseBenefitForm>
            <input type="hidden" name="operation" value="request"/><label>Message to APGI (optional)<textarea name="note" maxLength={2000}/></label>
            <button className="primary-button">Ask APGI about a discounted next attempt</button>
          </CourseBenefitForm>}
          {!state.learningComplete ? <p>Complete the required learning units before an attendance certificate becomes available.</p> : null}
        </> : null}
        {!state.failed && !state.passed ? <p>Continue your learning and assessment. Your assessor’s final decision will appear here when the evidence has been reviewed.</p> : null}
        <p><small>An attendance certificate confirms attendance only, not a pass or operator competence. It does not cancel your opportunity to try again.</small></p>
      </>}
    </article>
  </div></section>;
}
