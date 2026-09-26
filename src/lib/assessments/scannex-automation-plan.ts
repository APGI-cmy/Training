import { SCANNEX_PRACTICAL_RUBRIC } from "./scannex-practical-rubric";
import { AUTOMATED_PRACTICAL_MAX } from "./automated-practical";

// These are proposed evidence requirements, not implemented scoring rules.
// Do not award marks from UI clicks or a learner's assertion of completion.
const requirements: Record<string, { instruction: string; evidence: string }> = {
  four_viewing_modes: { instruction: "Examine the assigned image using the four viewing modes.", evidence: "Native events identifying the image, mode and sequence; validated criteria for correct use." },
  invert_mode: { instruction: "Use inversion to examine the assigned anomaly.", evidence: "Native inversion events and the approved case-specific interpretation." },
  contrast_density: { instruction: "Adjust contrast and density to examine the assigned areas.", evidence: "Native setting values, image regions and case-specific acceptable ranges." },
  key_software_features: { instruction: "Open the assigned Viewer and database, then import and save the designated training image.", evidence: "Successful native operations against isolated test files; merely opening a dialog is insufficient." },
  anomaly_annotation: { instruction: "Mark suspicious anomalies and add your observations.", evidence: "Saved annotation positions and comments matched to the approved case key." },
  systematic_scan: { instruction: "Examine the complete image using a systematic search sequence.", evidence: "Movement Log coverage and sequence evaluated against a calibrated search rule, not time alone." },
  viewing_modes_for_anomaly: { instruction: "Use the viewing modes to investigate each suspicious area.", evidence: "Native mode and region events plus case-specific interpretation evidence." },
  all_anomalies_identified: { instruction: "Mark every anomaly that requires action before completing the image.", evidence: "Native right, wrong and missed-object results, with a validated mapping to the five available marks." },
  annotation_during_interrogation: { instruction: "Use the annotation function during your examination.", evidence: "An annotation saved against the assigned image during this attempt." },
  normal_anatomy_vs_diamond: { instruction: "Classify the assigned features and explain which require further action.", evidence: "Responses and annotations compared with a case key that includes normal anatomical distractors." },
  checklist_applied: { instruction: "Complete the Scannex checklist for the suspicious features.", evidence: "A checklist linked to the current image and assessment attempt." },
  checklist_viewing_modes: { instruction: "Use the required viewing modes while completing each checklist category.", evidence: "Checklist entries linked to native viewing-mode events for the same image." },
  diamond_unstructured: { instruction: "Record your assessment of the anomaly's structure.", evidence: "A structured response compared with the approved case key and a defined 0–16 marking scale." },
  diamond_undefined_edges: { instruction: "Record your assessment of the anomaly's edges.", evidence: "A structured response compared with the approved case key." },
  diamond_uneven_density: { instruction: "Record your assessment of the anomaly's density distribution.", evidence: "A structured response compared with the approved case key." },
  density_check: { instruction: "Perform and record a density check on the suspicious area.", evidence: "A native density-check event and a corresponding checklist record." },
  record_anomaly_characteristics: { instruction: "Record the observed characteristics accurately on the checklist.", evidence: "Case-specific checklist responses and a defined partial-credit scale." },
  correct_conclusion: { instruction: "Record your conclusion from the examination and checklist.", evidence: "The selected conclusion matched to the approved case outcome and a defined 0–15 marking scale." },
  hidden_diamonds_detected: { instruction: "Identify and annotate the concealed objects requiring action.", evidence: "Native detections matched to approved target locations; object counts alone do not establish the case key." },
  correct_actions_recorded: { instruction: "Record the operational actions required by your conclusion.", evidence: "Structured actions checked against the approved procedure, including safety-critical failure rules." },
  checklist_signed: { instruction: "Confirm and submit your completed checklist.", evidence: "An authenticated submission bound to the learner, attempt, checklist version and timestamp." }
};

export const SCANNEX_AUTOMATION_ITEMS = SCANNEX_PRACTICAL_RUBRIC.map((criterion) => ({
  ...criterion,
  ...requirements[criterion.id],
  status: "Not validated" as const
}));

export const SCANNEX_AUTOMATION_RAW_TOTAL = SCANNEX_PRACTICAL_RUBRIC.reduce((total, criterion) => total + criterion.maximumScore, 0);
export const SCANNEX_AUTOMATION_SCORE_TOTAL_MATCHES = SCANNEX_AUTOMATION_RAW_TOTAL === AUTOMATED_PRACTICAL_MAX;

export const SCANNEX_AUTOMATION_PREREQUISITES = [
  { title: "Scoring version approved", detail: "New automated attempts use 100 practical marks, contributing 32 marks to the final result. Historical v1 results remain unchanged." },
  { title: "Hosted Windows session", detail: "The Ireland development machine passed the initial Viewer, TrainingTool and calibration checks on 25 September 2026 and was stopped. A published image, learner fleet, stack and embedded-session test are still required." },
  { title: "Approved cases and answer keys", detail: "Pilot A contains Image 11 (Pilot A – TWR1). The five-case register remains unapproved. Define targets, distractors and each item's marking scale." },
  { title: "Assessment mode", detail: "The original manual shows correct annotations after each image. Verify a supported way to keep assessment answers hidden during the attempt." },
  { title: "Automatic native evidence collection", detail: "The manual documents a Save Results action and Movement Log playback. Unattended launch, export, parsing and upload have not been verified." },
  { title: "Validated scoring and result delivery", detail: "Map all 21 items to reliable evidence; test incorrect actions, partial credit, missing evidence, retries and final-score delivery before enabling unattended results." }
] as const;
