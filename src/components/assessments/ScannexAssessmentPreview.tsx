import Link from "next/link";
import { SCANNEX_AUTOMATION_ITEMS } from "@/lib/assessments/scannex-automation-plan";
import type { ScannexTheoryQuestion } from "@/types/scannex-assessment";

export function ScannexAssessmentPreview({ questions }: { questions: ScannexTheoryQuestion[] }) {
  return <section className="scannex-assessment-preview" aria-labelledby="scannex-assessment-preview-heading">
    <div className="unit-resources">
      <p className="eyebrow">Final summative assessment</p>
      <h2 id="scannex-assessment-preview-heading">Knowledge and live Scannex practical</h2>
      <p>Part A contributes 68 marks. Part B contributes 32 marks. The overall pass requirement is 75/100.</p>
      <p className="resource-status">Preview only. No attempt is started and no scores or learner progress are saved.</p>
      <div className="button-row">
        <a className="primary-button" href="#knowledge-preview">View knowledge questions</a>
        <a className="secondary-button" href="#practical-preview">View practical instructions</a>
      </div>
    </div>
    <section className="unit-resources" id="knowledge-preview" aria-labelledby="knowledge-preview-heading">
      <p className="eyebrow">Part A · 68 marks</p>
      <h2 id="knowledge-preview-heading">Knowledge assessment</h2>
      <p>{questions.length} questions. Answer every question; single-choice and multiple-choice questions are indicated below. The answer key is not included in this preview.</p>
      <div className="quiz-stack">
        {questions.map((question, index) => <details className="quiz-question" key={question.id}>
          <summary>{index + 1}. {question.prompt} · {question.marks} marks</summary>
          <p>{question.instruction}</p>
          <ul>{question.options.map((option) => <li key={option.id}>{option.label}</li>)}</ul>
        </details>)}
      </div>
    </section>
    <section className="unit-resources" id="practical-preview" aria-labelledby="practical-preview-heading">
      <p className="eyebrow">Part B · 32 marks</p>
      <h2 id="practical-preview-heading">Practical instructions under development</h2>
      <p>The planned assessment presents instructions alongside the genuine Scannex Viewer in the browser, records the learner's actions and calculates the result from validated evidence.</p>
      <p className="resource-status">Automated practical delivery is not yet available. These draft instructions still require approved cases and verified scoring rules.</p>
      <ol className="scannex-instruction-list">{SCANNEX_AUTOMATION_ITEMS.map((item) => <li key={item.id}>{item.instruction}</li>)}</ol>
      <Link className="secondary-button" href="/admin/assessments/automation">Review automation requirements</Link>
    </section>
  </section>;
}
