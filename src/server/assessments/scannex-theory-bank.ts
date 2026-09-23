import "server-only";

import type { ScannexTheoryAnswerState, ScannexTheoryQuestion } from "@/types/scannex-assessment";

export const SCANNEX_THEORY_MAX_SCORE = 68;
export const SCANNEX_PRACTICAL_MAX_SCORE = 32;
export const SCANNEX_SUMMATIVE_PASS_MARK = 75;
export const SCANNEX_THEORY_VERSION = "scannex-summative-v1";

type MarkedQuestion = ScannexTheoryQuestion & { correctOptionIds: string[] };

const questions: MarkedQuestion[] = [
  {
    id: "co-operation",
    section: "Co-operation with different disciplines",
    prompt: "The nature of the Scannex Viewer's job is such that it is conducted in isolation with no interaction with other security disciplines.",
    instruction: "Choose one answer.",
    marks: 2,
    responseType: "single",
    options: [{ id: "true", label: "True" }, { id: "false", label: "False" }],
    correctOptionIds: ["false"]
  },
  {
    id: "xray-versus-searching",
    section: "Benefits of using Scannex",
    prompt: "Which statement about x-ray scanning is true?",
    instruction: "Choose one answer.",
    marks: 4,
    responseType: "single",
    options: [
      { id: "a", label: "X-ray scanning is more effective, especially if diamonds are hidden within the human body." },
      { id: "b", label: "X-ray scanning clearly detects all diamonds with a visible halo on the Scannex image." },
      { id: "c", label: "X-ray scanning is an infringement of a person's privacy." },
      { id: "d", label: "Searching is the preferred method of detecting diamond theft because it is much safer than x-ray scanning." }
    ],
    correctOptionIds: ["a"]
  },
  {
    id: "scannex-advantages",
    section: "Benefits of using Scannex",
    prompt: "Which are advantages of the Scannex system?",
    instruction: "Select every correct response.",
    marks: 4,
    responseType: "multiple",
    options: [
      { id: "a", label: "It speeds up the search process." },
      { id: "b", label: "It can operate in isolation with no human intervention." },
      { id: "c", label: "It protects employees against potential blackmail, intimidation and coercion." },
      { id: "d", label: "It assists in changing the behaviour of people working at the operation." }
    ],
    correctOptionIds: ["a", "c", "d"]
  },
  {
    id: "layout-scan-operator",
    section: "Basic Scannex layout",
    prompt: "For the Scan Operator, choose the correct statement.",
    instruction: "Choose one answer.",
    marks: 2,
    responseType: "single",
    options: [
      { id: "a", label: "This is the person manning position number 1 on the Scannex layout." },
      { id: "b", label: "This is the person manning position number 6 on the Scannex layout." }
    ],
    correctOptionIds: ["a"]
  },
  {
    id: "layout-entry-door",
    section: "Basic Scannex layout",
    prompt: "For the Entry Door, choose the correct statement.",
    instruction: "Choose one answer.",
    marks: 2,
    responseType: "single",
    options: [
      { id: "a", label: "This door provides entrance to the Scannex set-up." },
      { id: "b", label: "This door provides entrance to the red area." }
    ],
    correctOptionIds: ["a"]
  },
  {
    id: "layout-scannex-cubicle",
    section: "Basic Scannex layout",
    prompt: "For the Scannex Cubicle / Full Body Scan, choose the correct statement.",
    instruction: "Choose one answer.",
    marks: 2,
    responseType: "single",
    options: [
      { id: "a", label: "This is where individuals going through the Scannex system are searched." },
      { id: "b", label: "This is where full x-ray body images are taken." }
    ],
    correctOptionIds: ["b"]
  },
  {
    id: "layout-waiting-booth",
    section: "Basic Scannex layout",
    prompt: "For the Waiting Booth, choose the correct statement.",
    instruction: "Choose one answer.",
    marks: 2,
    responseType: "single",
    options: [
      { id: "a", label: "This is where individuals going through the Scannex system are searched." },
      { id: "b", label: "This is where people wait until they receive permission to exit the system." }
    ],
    correctOptionIds: ["a"]
  },
  {
    id: "layout-viewer-station",
    section: "Basic Scannex layout",
    prompt: "For the Viewer Station, choose the correct statement.",
    instruction: "Choose one answer.",
    marks: 2,
    responseType: "single",
    options: [
      { id: "a", label: "This is where the Scannex Viewer analyses scanned images." },
      { id: "b", label: "This is the position from which the supervisor watches the entire operation." }
    ],
    correctOptionIds: ["a"]
  },
  {
    id: "layout-supervisor-station",
    section: "Basic Scannex layout",
    prompt: "For the Supervisor Station, choose the correct statement.",
    instruction: "Choose one answer.",
    marks: 2,
    responseType: "single",
    options: [
      { id: "a", label: "This is the position from which the supervisor watches the entire operation." },
      { id: "b", label: "This is the position from which surveillance is conducted over the entire Scannex operation." }
    ],
    correctOptionIds: ["a"]
  },
  {
    id: "integrated-subsystems",
    section: "Integrated sub-systems",
    prompt: "Which are part of the integrated sub-system of Scannex?",
    instruction: "Select every correct response.",
    marks: 4,
    responseType: "multiple",
    options: [
      { id: "a", label: "The access control system." },
      { id: "b", label: "The x-ray dosage management system." },
      { id: "c", label: "The alarm system." },
      { id: "d", label: "The Scannex machine." }
    ],
    correctOptionIds: ["a", "b"]
  },
  {
    id: "xray-technology",
    section: "X-ray technology",
    prompt: "Which statements about Scannex are true?",
    instruction: "Select every correct response.",
    marks: 4,
    responseType: "multiple",
    options: [
      { id: "a", label: "Scannex is a high-dosage x-ray scanner." },
      { id: "b", label: "Scannex produces a low-resolution digital image." },
      { id: "c", label: "Scannex scans the whole body of a person within 30 seconds." },
      { id: "d", label: "Scannex scanning is performed in a non-invasive manner." }
    ],
    correctOptionIds: ["c", "d"]
  },
  {
    id: "xray-radiation",
    section: "X-ray technology",
    prompt: "Which statements about the x-ray radiation of Scannex are true?",
    instruction: "Select every correct response.",
    marks: 3,
    responseType: "multiple",
    options: [
      { id: "a", label: "Exposure is low enough that an individual can be scanned daily." },
      { id: "b", label: "Exposure is more than internationally accepted safety standards." },
      { id: "c", label: "The x-ray management system will not allow 4.3 mSv per year to be exceeded." }
    ],
    correctOptionIds: ["a", "c"]
  },
  {
    id: "xray-exclusions",
    section: "X-ray technology",
    prompt: "Who should be excluded from x-ray scanning?",
    instruction: "Select every correct response.",
    marks: 3,
    responseType: "multiple",
    options: [
      { id: "a", label: "People older than 40 years of age." },
      { id: "b", label: "Pregnant women." },
      { id: "c", label: "People under the age of 16." }
    ],
    correctOptionIds: ["b", "c"]
  },
  {
    id: "prohibited-items",
    section: "Prevention and detection of pre-identified contraband",
    prompt: "Which objects are not permitted to go into the mine at all?",
    instruction: "Select every correct response.",
    marks: 3,
    responseType: "multiple",
    options: [
      { id: "a", label: "Knives." },
      { id: "b", label: "A laptop and camera for which permission has been obtained." },
      { id: "c", label: "A firearm." }
    ],
    correctOptionIds: ["a", "c"]
  },
  {
    id: "permitted-items",
    section: "Prevention and detection of pre-identified contraband",
    prompt: "Which objects may go into the mine but may not be taken out?",
    instruction: "Select every correct response.",
    marks: 3,
    responseType: "multiple",
    options: [
      { id: "a", label: "Medication." },
      { id: "b", label: "A cell phone." },
      { id: "c", label: "An apple or banana." }
    ],
    correctOptionIds: ["a", "b", "c"]
  },
  {
    id: "concealment-areas",
    section: "Prevention and detection of pre-identified contraband",
    prompt: "Which are basic areas or places on a person where contraband could be detected?",
    instruction: "Select every correct response.",
    marks: 4,
    responseType: "multiple",
    options: [
      { id: "a", label: "Behind the button of a shirt." },
      { id: "b", label: "Under the armpits." },
      { id: "c", label: "Inside the sole of a shoe." },
      { id: "d", label: "Inside the lungs after it has been swallowed." }
    ],
    correctOptionIds: ["a", "b", "c"]
  },
  {
    id: "body-search-principles",
    section: "Prevention and detection of pre-identified contraband",
    prompt: "Which principles apply when conducting a body search?",
    instruction: "Select every correct response.",
    marks: 4,
    responseType: "multiple",
    options: [
      { id: "a", label: "Remind the person of the permission given by signing their employment document." },
      { id: "b", label: "Ask the person whether they want to go to the toilet." },
      { id: "c", label: "Follow a systematic approach and pat the body from head to toe." },
      { id: "d", label: "Ask the person whether they have anything to declare before the search commences." }
    ],
    correctOptionIds: ["a", "c", "d"]
  },
  {
    id: "viewing-system",
    section: "Scannex Viewing System",
    prompt: "Which statements about the functionality of the Scannex Viewing System are true?",
    instruction: "Select every correct response.",
    marks: 3,
    responseType: "multiple",
    options: [
      { id: "a", label: "It gives more image-enhancement options to the viewer." },
      { id: "b", label: "It is unable to compare previous images of a subject." },
      { id: "c", label: "It has mouse and keyboard options for using the system." }
    ],
    correctOptionIds: ["a", "c"]
  },
  {
    id: "material-density",
    section: "Anomalies",
    prompt: "Which statements about the density of materials are true?",
    instruction: "Select every correct response.",
    marks: 4,
    responseType: "multiple",
    options: [
      { id: "a", label: "The denser the object, the less penetration and the better its visibility on a normal x-ray image." },
      { id: "b", label: "Penetration through a low-density object, such as an organ, results in a light appearance on a normal x-ray image." },
      { id: "c", label: "A high-density object, such as a belt buckle, appears white on a normal x-ray image." },
      { id: "d", label: "The density and composition of diamonds differs vastly from that of the human skeleton." }
    ],
    correctOptionIds: ["a", "c"]
  },
  {
    id: "diamond-concealment",
    section: "Anomalies",
    prompt: "Which areas can be used for diamond concealment?",
    instruction: "Select every correct response.",
    marks: 5,
    responseType: "multiple",
    options: [
      { id: "a", label: "A nostril." },
      { id: "b", label: "Under the tongue." },
      { id: "c", label: "The kidneys." },
      { id: "d", label: "The lungs." },
      { id: "e", label: "Somewhere in the digestive tract." }
    ],
    correctOptionIds: ["a", "b", "e"]
  },
  {
    id: "digestive-tract",
    section: "Human anatomy",
    prompt: "Which human-body system is relevant to tracing the route diamonds follow after being swallowed?",
    instruction: "Choose one answer.",
    marks: 3,
    responseType: "single",
    options: [
      { id: "a", label: "The urinary tract." },
      { id: "b", label: "The reproductive organs." },
      { id: "c", label: "The digestive tract." }
    ],
    correctOptionIds: ["c"]
  },
  {
    id: "anatomy-importance",
    section: "Human anatomy",
    prompt: "Why is the digestive tract important in x-ray scanning?",
    instruction: "Choose one answer.",
    marks: 3,
    responseType: "single",
    options: [
      { id: "a", label: "They consist of the vital organs needed for breathing." },
      { id: "b", label: "They indicate the route diamonds will follow through the human body after being swallowed." },
      { id: "c", label: "They show organs in which it would be impossible to hide diamonds." }
    ],
    correctOptionIds: ["b"]
  }
];

export function getScannexTheoryQuestions(): ScannexTheoryQuestion[] {
  return questions.map(({ correctOptionIds: _correctOptionIds, ...question }) => question);
}

export function scoreScannexTheoryAssessment(answers: ScannexTheoryAnswerState) {
  let score = 0;

  for (const question of questions) {
    const validOptions = new Set(question.options.map((option) => option.id));
    const selected = [...new Set((answers[question.id] ?? []).filter((optionId) => validOptions.has(optionId)))].sort();
    const expected = [...question.correctOptionIds].sort();
    const isCorrect = selected.length === expected.length && selected.every((optionId, index) => optionId === expected[index]);
    if (isCorrect) score += question.marks;
  }

  return {
    score,
    maxScore: SCANNEX_THEORY_MAX_SCORE,
    passed: score + SCANNEX_PRACTICAL_MAX_SCORE >= SCANNEX_SUMMATIVE_PASS_MARK
  };
}

export function hasAnswerForEveryScannexTheoryQuestion(answers: ScannexTheoryAnswerState) {
  return questions.every((question) => Array.isArray(answers[question.id]) && answers[question.id].length > 0);
}
