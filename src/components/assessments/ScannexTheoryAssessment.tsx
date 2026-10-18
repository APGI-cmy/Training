"use client";

import { useActionState, useState } from "react";
import {
  submitScannexTheoryAttempt,
  type ScannexTheoryActionState
} from "@/server/actions/assessments/submit-scannex-theory-attempt";
import type { ScannexTheoryAnswerState, ScannexTheoryQuestion } from "@/types/scannex-assessment";
import {previewReviewTheory} from "@/server/actions/course-reviews";

const initialState: ScannexTheoryActionState = {};

export function ScannexTheoryAssessment({
  courseSlug,
  questions,
  latestResult,
  reviewId
}: {
  courseSlug: string;
  questions: ScannexTheoryQuestion[];
  latestResult: { score: number; maxScore: number; submittedAt: string } | null;
  reviewId?: string;
}) {
  const [answers, setAnswers] = useState<ScannexTheoryAnswerState>({});
  const [state, action, pending] = useActionState(reviewId?previewReviewTheory:submitScannexTheoryAttempt, initialState);

  function setAnswer(question: ScannexTheoryQuestion, optionId: string) {
    setAnswers((current) => {
      const selected = current[question.id] ?? [];
      const next = question.responseType === "single"
        ? [optionId]
        : selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId];

      return { ...current, [question.id]: next };
    });
  }

  return (
    <section className="content-band" aria-labelledby="scannex-theory-heading">
      <div className="content-inner">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Part A: knowledge assessment</p>
            <h2 id="scannex-theory-heading">Scannex theory assessment</h2>
            <p>{reviewId?"Review preview: scoring is checked on the server, but no learner attempt, grade or certificate is recorded.":"Answer every question. The correct answers are assessed securely after submission and are not displayed."}</p>
          </div>
          <div className="score-badge">68 marks</div>
        </div>

        {latestResult ? (
          <p className="resource-status" role="status">
            Latest recorded theory score: {latestResult.score}/{latestResult.maxScore}. Submitted {new Date(latestResult.submittedAt).toLocaleString()}.
          </p>
        ) : null}

        <form action={action} className="assessment-form">
          {reviewId?<input type="hidden" name="round_id" value={reviewId}/>:null}
          <input name="courseSlug" type="hidden" value={courseSlug} readOnly />
          <input name="answers" type="hidden" value={JSON.stringify(answers)} readOnly />

          <div className="quiz-stack">
            {questions.map((question, index) => {
              const selected = answers[question.id] ?? [];
              return (
                <article className="quiz-question" key={question.id}>
                  <div className="assessment-question-header">
                    <p className="question-count">Question {index + 1}</p>
                    <span>{question.marks} marks</span>
                  </div>
                  <p className="eyebrow">{question.section}</p>
                  <h3>{question.prompt}</h3>
                  <p>{question.instruction}</p>
                  <div className="option-grid">
                    {question.options.map((option) => (
                      <label className="option-tile" key={option.id}>
                        <input
                          type={question.responseType === "single" ? "radio" : "checkbox"}
                          name={question.id}
                          checked={selected.includes(option.id)}
                          onChange={() => setAnswer(question, option.id)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
          {state.message ? (
            <p className="feedback feedback-correct" role="status">
              {state.message} Score: {state.score}/{state.maxScore}.
            </p>
          ) : null}

          <div className="button-row">
            <button className="primary-button" type="submit" disabled={pending}>
              {pending ? "Checking assessment…" : reviewId?"Check preview answers (no learner record)":"Submit knowledge assessment"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
