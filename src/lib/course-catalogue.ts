import vpshrLevel0 from "@/data/vpshr-level-0.json";
import tigerKidnapping from "@/data/tiger-kidnapping-telecommunications.json";
import type {Course,LearningUnit} from "@/types/course";

const scannexSourceRoot = "/courses/Scannex%20Training%20Programme";

function scannexUnit(
  order: number,
  folder: string,
  title: string,
  subtitle: string,
  trainingFolder?: string,
  scormFolder?: string,
  practicalAssessment?: LearningUnit["practicalAssessment"]
): LearningUnit {
  const unitRoot = `${scannexSourceRoot}/${encodeURIComponent(folder)}`;
  const publishedPath = `${unitRoot}/index.html`;
  const trainingPath = trainingFolder
    ? `${unitRoot}/${encodeURIComponent(trainingFolder)}/index.html`
    : undefined;
  const scormPath = scormFolder
    ? `${unitRoot}/${encodeURIComponent(scormFolder)}/res/index.html`
    : undefined;

  return {
    id: `scannex-lu-${order}`,
    slug: `lu${order}`,
    order,
    title,
    subtitle,
    duration: "Self-paced",
    assetBase: unitRoot,
    publishedPath,
    trainingPath,
    scormPath,
    practicalAssessment,
    objectives: [],
    media: [{ kind: "embed", title, src: trainingPath ?? publishedPath }],
    slides: [],
    quiz: [],
    survey: [],
    summary: []
  };
}

const scannexTrainingProgramme: Course = {
  id: "scannex-training-programme",
  slug: "scannex-training-programme",
  title: "Scannex Training Programme",
  level: "Operator programme",
  description: "Professional Scannex viewing and decision training delivered through governed learning units.",
  audience: "Authorized Scannex operators and reviewers",
  duration: "8 learning units and a summative assessment",
  sourceRoot: scannexSourceRoot,
  integrationNotes: [
    "Each learning unit contains its Scannex e-book and, once published, its interactive activities and quizzes.",
    "Governed learner access is controlled through ALP enrolment state."
  ],
  units: [
    scannexUnit(1, "LU 1 - Introduction & The Case for Scannex", "Introduction and the Case for Scannex", "Programme orientation and operational purpose", undefined, "LU 1 (SCORM)"),
    scannexUnit(2, "LU 2 - The X-ray", "The X-ray", "X-ray principles and image formation", "LU 2 (Published)", "LU 2 (SCORM)"),
    scannexUnit(3, "LU 3 - Radiation Safety & International Standards", "Radiation Safety and International Standards", "Safe and compliant operation", undefined, "LU 3 (SCORM)"),
    scannexUnit(4, "LU 4 - The Legal & Human Rights Framework", "The Legal and Human Rights Framework", "Lawful, proportionate and respectful screening", undefined, "LU 4 (SCORM)"),
    scannexUnit(5, "LU 5 - The Scannex System", "The Scannex System", "System components and operating context", undefined, "LU 5 (SCORM)"),
    scannexUnit(6, "LU 6 - The Viewing System", "The Viewing System", "Viewer controls and systematic examination", undefined, "LU 6 (SCORM)"),
    scannexUnit(7, "LU 7 - Image Interpretation & Detection", "Image Interpretation and Detection", "Recognition, comparison and decision support", undefined, "LU 7 (SCORM)"),
    scannexUnit(8, "LU 8 Human Anatomy for the operator", "Human Anatomy for the Operator", "Anatomical orientation for professional viewing", undefined, "LU 8 (SCORM)"),
    scannexUnit(
      9,
      "LU 9 Procedures, Records, and profesional conduct",
      "Summative Assessment: Knowledge and Scannex Practical",
      "A 68-mark knowledge assessment and a supervised 32-mark practical assessment at an approved Scannex training station.",
      undefined,
      undefined,
      {
        labPath: "/learn/scannex-training-programme/units/lu9/viewer-lab",
        description: "Complete the supervised 32-mark practical exercise at your approved Scannex training station."
      }
    )
  ]
};

export const courses: Course[] = [vpshrLevel0 as Course, scannexTrainingProgramme, tigerKidnapping as Course];

