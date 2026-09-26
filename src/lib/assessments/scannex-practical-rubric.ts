export const SCANNEX_PRACTICAL_RUBRIC_VERSION = "scannex-practical-v1";
export const SCANNEX_PRACTICAL_RAW_MAX_SCORE = 99;
export const SCANNEX_PRACTICAL_NORMALIZED_MAX_SCORE = 100;

export type ScannexPracticalCriterion = {
  id: string;
  section: string;
  label: string;
  maximumScore: number;
};

// Legacy v1 keeps its historical 99-mark normalisation. The 21 item maxima
// actually total 100; automated v2 uses 100 directly without rewriting v1 records.
export const SCANNEX_PRACTICAL_RUBRIC: ScannexPracticalCriterion[] = [
  { id: "four_viewing_modes", section: "Use of the Scannex application", label: "Uses the four viewing modes correctly", maximumScore: 4 },
  { id: "invert_mode", section: "Use of the Scannex application", label: "Uses the invert mode correctly", maximumScore: 2 },
  { id: "contrast_density", section: "Use of the Scannex application", label: "Adjusts contrast and density and applies the features correctly", maximumScore: 5 },
  { id: "key_software_features", section: "Use of the Scannex application", label: "Uses key software features, including opening the Viewer and database, importing and saving images", maximumScore: 5 },
  { id: "anomaly_annotation", section: "Use of the Scannex application", label: "Annotates and comments on anomalies", maximumScore: 4 },
  { id: "systematic_scan", section: "Interrogation of images", label: "Follows a systematic scanning approach to analyse an anomaly", maximumScore: 6 },
  { id: "viewing_modes_for_anomaly", section: "Interrogation of images", label: "Uses the four viewing modes effectively for anomaly identification", maximumScore: 5 },
  { id: "all_anomalies_identified", section: "Interrogation of images", label: "Identifies all required anomalies on the image", maximumScore: 5 },
  { id: "annotation_during_interrogation", section: "Interrogation of images", label: "Uses the annotation function during image interrogation", maximumScore: 1 },
  { id: "normal_anatomy_vs_diamond", section: "Interrogation of images", label: "Differentiates normal body features that resemble a diamond from a credible diamond anomaly", maximumScore: 8 },
  { id: "checklist_applied", section: "Use of the Scannex checklist", label: "Applies the checklist when interrogating suspicious anomalies", maximumScore: 1 },
  { id: "checklist_viewing_modes", section: "Use of the Scannex checklist", label: "Uses all required viewing modes for the checklist categories", maximumScore: 4 },
  { id: "diamond_unstructured", section: "Use of the Scannex checklist", label: "Recognises the unstructured appearance of a diamond on an x-ray image", maximumScore: 16 },
  { id: "diamond_undefined_edges", section: "Use of the Scannex checklist", label: "Recognises the undefined edges of a diamond on an x-ray image", maximumScore: 1 },
  { id: "diamond_uneven_density", section: "Use of the Scannex checklist", label: "Recognises the uneven density spread of a diamond on an x-ray image", maximumScore: 1 },
  { id: "density_check", section: "Use of the Scannex checklist", label: "Performs a density check when interrogating the x-ray image", maximumScore: 1 },
  { id: "record_anomaly_characteristics", section: "Use of the Scannex checklist", label: "Records anomaly characteristics accurately on the checklist", maximumScore: 5 },
  { id: "correct_conclusion", section: "Use of the Scannex checklist", label: "Reaches the correct conclusion from the checklist findings", maximumScore: 15 },
  { id: "hidden_diamonds_detected", section: "Use of the Scannex checklist", label: "Detects the hidden diamonds on the image", maximumScore: 5 },
  { id: "correct_actions_recorded", section: "Use of the Scannex checklist", label: "Records the correct actions on the Scannex checklist", maximumScore: 4 },
  { id: "checklist_signed", section: "Use of the Scannex checklist", label: "Ensures the Scannex checklist is signed appropriately", maximumScore: 2 }
];

export type ScannexPracticalScores = Record<string, number>;

export function calculateScannexPracticalScore(scores: ScannexPracticalScores) {
  const rawScore = SCANNEX_PRACTICAL_RUBRIC.reduce((total, criterion) => total + (scores[criterion.id] ?? 0), 0);
  const normalizedScore = Math.round((rawScore / SCANNEX_PRACTICAL_RAW_MAX_SCORE) * SCANNEX_PRACTICAL_NORMALIZED_MAX_SCORE * 100) / 100;
  return { rawScore, normalizedScore };
}
