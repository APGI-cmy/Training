"use client";

import { useMemo, useState } from "react";
import type {
  ChoiceQuestion,
  DragWordsQuestion,
  MatchingQuestion,
  MultipleResponseQuestion,
  QuizQuestion
} from "@/types/course";

type QuestionAnswer = string | string[] | Record<string, string>;
type AnswerState = Record<string, QuestionAnswer>;

interface QuizEngineProps {
  unitId: string;
  questions: QuizQuestion[];
}

export function QuizEngine({ unitId, questions }: QuizEngineProps) {
  const [answers, setAnswers] = useState<AnswerState>({});
  const [submitted, setSubmitted] = useState(false);
  const score = useMemo(
    () => questions.filter((question) => isQuestionCorrect(question, answers[question.id])).length,
    [answers, questions]
  );
  const scoreLabel = `${score}/${questions.length}`;

  if (questions.length === 0) {
    return null;
  }

  function submitQuiz() {
    setSubmitted(true);
    window.localStorage.setItem(`apgi-training-score-${unitId}`, scoreLabel);
  }

  function resetQuiz() {
    setAnswers({});
    setSubmitted(false);
    window.localStorage.removeItem(`apgi-training-score-${unitId}`);
  }

  return (
    <section className="content-band" aria-labelledby="quiz-heading">
      <div className="content-inner">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Quiz</p>
            <h2 id="quiz-heading">Knowledge check</h2>
          </div>
          <div className="score-badge" aria-live="polite">
            {submitted ? `Score ${scoreLabel}` : `${questions.length} questions`}
          </div>
        </div>

        <div className="quiz-stack">
          {questions.map((question, index) => (
            <article className="quiz-question" key={question.id}>
              <p className="question-count">Question {index + 1}</p>
              <h3>{question.prompt}</h3>
              <QuestionControl
                question={question}
                answer={answers[question.id]}
                setAnswer={(answer) =>
                  setAnswers((currentAnswers) => ({
                    ...currentAnswers,
                    [question.id]: answer
                  }))
                }
              />
              {submitted && (
                <p
                  className={
                    isQuestionCorrect(question, answers[question.id])
                      ? "feedback feedback-correct"
                      : "feedback feedback-review"
                  }
                >
                  {question.feedback}
                </p>
              )}
            </article>
          ))}
        </div>

        <div className="button-row">
          <button className="primary-button" type="button" onClick={submitQuiz}>
            Submit quiz
          </button>
          <button className="secondary-button" type="button" onClick={resetQuiz}>
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}

function QuestionControl({
  question,
  answer,
  setAnswer
}: {
  question: QuizQuestion;
  answer: QuestionAnswer | undefined;
  setAnswer: (answer: QuestionAnswer) => void;
}) {
  if (question.type === "multipleChoice" || question.type === "trueFalse") {
    return <ChoiceControl question={question} answer={answer} setAnswer={setAnswer} />;
  }

  if (question.type === "multipleResponse") {
    return <MultipleResponseControl question={question} answer={answer} setAnswer={setAnswer} />;
  }

  if (question.type === "matching") {
    return <MatchingControl question={question} answer={answer} setAnswer={setAnswer} />;
  }

  if (question.type === "dragWords") {
    return <DragWordsControl question={question} answer={answer} setAnswer={setAnswer} />;
  }

  return null;
}

function ChoiceControl({
  question,
  answer,
  setAnswer
}: {
  question: ChoiceQuestion;
  answer: QuestionAnswer | undefined;
  setAnswer: (answer: QuestionAnswer) => void;
}) {
  return (
    <div className="option-grid">
      {question.options.map((option) => (
        <label className="option-tile" key={option.id}>
          <input
            type="radio"
            name={question.id}
            checked={answer === option.id}
            onChange={() => setAnswer(option.id)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

function MultipleResponseControl({
  question,
  answer,
  setAnswer
}: {
  question: MultipleResponseQuestion;
  answer: QuestionAnswer | undefined;
  setAnswer: (answer: QuestionAnswer) => void;
}) {
  const selectedAnswers = Array.isArray(answer) ? answer : [];

  function toggleAnswer(optionId: string) {
    const nextAnswers = selectedAnswers.includes(optionId)
      ? selectedAnswers.filter((id) => id !== optionId)
      : [...selectedAnswers, optionId];

    setAnswer(nextAnswers);
  }

  return (
    <div className="option-grid">
      {question.options.map((option) => (
        <label className="option-tile" key={option.id}>
          <input
            type="checkbox"
            checked={selectedAnswers.includes(option.id)}
            onChange={() => toggleAnswer(option.id)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

function MatchingControl({
  question,
  answer,
  setAnswer
}: {
  question: MatchingQuestion;
  answer: QuestionAnswer | undefined;
  setAnswer: (answer: QuestionAnswer) => void;
}) {
  const selectedAnswers = isRecordAnswer(answer) ? answer : {};
  const rightOptions = question.pairs.map((pair) => pair.right);

  return (
    <div className="matching-grid">
      {question.pairs.map((pair) => (
        <label className="matching-row" key={pair.left}>
          <span>{pair.left}</span>
          <select
            value={selectedAnswers[pair.left] ?? ""}
            onChange={(event) =>
              setAnswer({
                ...selectedAnswers,
                [pair.left]: event.target.value
              })
            }
          >
            <option value="">Choose a match</option>
            {rightOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

function DragWordsControl({
  question,
  answer,
  setAnswer
}: {
  question: DragWordsQuestion;
  answer: QuestionAnswer | undefined;
  setAnswer: (answer: QuestionAnswer) => void;
}) {
  const selectedAnswers = Array.isArray(answer)
    ? answer.slice(0, question.answer.length)
    : Array<string>(question.answer.length).fill("");

  function placeWord(index: number, wordId: string) {
    const nextAnswers = [...selectedAnswers];
    nextAnswers[index] = wordId;
    setAnswer(nextAnswers);
  }

  function placeNextEmpty(wordId: string) {
    const nextIndex = selectedAnswers.findIndex((candidate) => !candidate);

    if (nextIndex >= 0) {
      placeWord(nextIndex, wordId);
    }
  }

  return (
    <div className="drag-words">
      <p className="sentence-builder">
        {question.sentenceParts.map((part, index) => (
          <span key={`${question.id}-${part}-${index}`}>
            {part}
            {index < question.answer.length && (
              <button
                className="drop-word"
                type="button"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => placeWord(index, event.dataTransfer.getData("text/plain"))}
                onClick={() => placeWord(index, "")}
              >
                {question.words.find((word) => word.id === selectedAnswers[index])?.label ||
                  "Drop word"}
              </button>
            )}
          </span>
        ))}
      </p>
      <div className="word-bank">
        {question.words.map((word) => (
          <button
            draggable
            className="word-chip"
            key={word.id}
            type="button"
            onDragStart={(event) => event.dataTransfer.setData("text/plain", word.id)}
            onClick={() => placeNextEmpty(word.id)}
          >
            {word.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function isQuestionCorrect(question: QuizQuestion, answer: QuestionAnswer | undefined): boolean {
  if (!answer) {
    return false;
  }

  if (question.type === "multipleChoice" || question.type === "trueFalse") {
    return answer === question.answer;
  }

  if (question.type === "multipleResponse") {
    if (!Array.isArray(answer)) {
      return false;
    }

    return arraysMatch(answer, question.answers);
  }

  if (question.type === "matching") {
    if (!isRecordAnswer(answer)) {
      return false;
    }

    return question.pairs.every((pair) => answer[pair.left] === pair.right);
  }

  if (question.type !== "dragWords" || !Array.isArray(answer)) {
    return false;
  }

  return arraysMatch(answer, question.answer);
}

function arraysMatch(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isRecordAnswer(answer: QuestionAnswer | undefined): answer is Record<string, string> {
  return typeof answer === "object" && !Array.isArray(answer) && answer !== null;
}
