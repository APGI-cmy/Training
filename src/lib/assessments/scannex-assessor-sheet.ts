export const ASSIGNMENT_RUBRIC_VERSION = "scannex-practical-v1-assessor-sheet-20261125";
export const PREVIOUS_ASSIGNMENT_RUBRIC_VERSION = "scannex-practical-v1-even-density-20261125";
export const PRACTICAL_COURSE_MARKS = 32;

// Applies only to the V1 recorded assignment. Do not change the legacy station rubric.
export const ASSIGNMENT_RUBRIC = [
  { id: "systematic_scan", maximumScore: 4, label: "Set up the correct image and scan systematically",
    guidance: "Match the assigned source and check the six timestamped regions against the evidence, from feet to head." },
  { id: "optimise_four_modes", maximumScore: 4, label: "Use and optimise F1–F4",
    guidance: "Check actual use and readable detail in each mode against the image’s clarity benchmark. A mode toggle or unsupported checkbox alone earns no credit." },
  { id: "identify_annotate_comment", maximumScore: 6, label: "Locate, annotate and comment on relevant findings",
    guidance: "Compare the native annotation, location and remark with the evidence and the case key. Check that required targets were found." },
  { id: "rule_out_lookalikes", maximumScore: 4, label: "Rule out obvious lookalikes with reasons",
    guidance: "Distinguish normal anatomy and recognisable items from unresolved findings. Check the reason for retaining, excluding or escalating each candidate." },
  { id: "apply_checklist", maximumScore: 6, label: "Apply the Viewer checklist to retained findings",
    guidance: "Verify anomaly, structure and edges in F1–F4; spread and density in F1/F2 only. Even spread is the qualifying observation. Check the bone reference, emboss comparison and position; mark uncertainty rather than guessing." },
  { id: "interpret_against_key", maximumScore: 8, label: "Interpret findings against the approved case key",
    guidance: "Compare the interpretation with the confirmed target or non-target, including subtle findings and false positives. Image appearance alone does not establish material identity." },
  { id: "justify_case_action", maximumScore: 6, label: "Decide and justify Hold, Release or Review",
    guidance: "Check whether the case action follows the reference findings and the learner’s stated reasons. Unresolved visibility or findings require review, not automatic release." },
  { id: "traceable_signed_report", maximumScore: 2, label: "Provide a traceable, signed report",
    guidance: "Check that the signed report, images, annotations and recording or native log can be matched to the same assigned cases." },
] as const;

export const ASSIGNMENT_RAW_MAX = ASSIGNMENT_RUBRIC.reduce((total, row) => total + row.maximumScore, 0);

export function practicalRubricRawMaximum(version: string) {
  if (version === ASSIGNMENT_RUBRIC_VERSION) return ASSIGNMENT_RAW_MAX;
  return version === PREVIOUS_ASSIGNMENT_RUBRIC_VERSION ? 100 : 99;
}

export function assignmentScore(scores: Record<string, unknown>) {
  if (Object.keys(scores).length !== ASSIGNMENT_RUBRIC.length) return null;
  let rawScore = 0;
  for (const row of ASSIGNMENT_RUBRIC) {
    const mark = scores[row.id];
    if (typeof mark !== "number" || !Number.isInteger(mark) || mark < 0 || mark > row.maximumScore) return null;
    rawScore += mark;
  }
  return {
    rawScore,
    normalizedScore: Math.round(rawScore * 10_000 / ASSIGNMENT_RAW_MAX) / 100,
    practicalMarks: Math.round(rawScore * PRACTICAL_COURSE_MARKS * 100 / ASSIGNMENT_RAW_MAX) / 100,
  };
}

export const IMAGE_78_PILOT = {
  label: "Image 78",
  filename: "F000000078.Tiff",
  sha256: "8d2f0a68b41238603a99c560e13db3a48561b9c81e0b12626680d7f279e9755f",
  referenceStatus: "unknown",
} as const;

export function isImage78Pilot(file: { original_filename: string; sha256: string | null }) {
  return file.sha256?.toLowerCase() === IMAGE_78_PILOT.sha256 ||
    /^f000000078\.tiff?$/i.test(file.original_filename.trim());
}
