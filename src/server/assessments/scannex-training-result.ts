import { createHash } from "node:crypto";

export type TrainingResultBinding = {
  imageId: number;
  viewerName: string;
  viewerId: string;
  referenceTargetCount: number;
};

export type TrainingDetectionCounts = { right: number; wrong: number; missed: number };

const MAX_EXPORT_BYTES = 16 * 1024;
const COLUMN_HEADER = '"Name"\t"ID"\t"Right"\t"Wrong"\t"Missed"\t"Right"\t"Wrong"\t"Missed"';

function count(value: string): number {
  if (!/^(0|[1-9]\d*)$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new Error("Invalid native detection count.");
  }
  return Number(value);
}

function identity(value: string): string {
  // Only the ASCII quoted-field encoding observed in the native exports is supported.
  if (!/^"[\x20-\x21\x23-\x7e]+"$/.test(value)) {
    throw new Error("Unsupported native viewer identity encoding.");
  }
  return value.slice(1, -1);
}

/**
 * Parses the single-image, single-viewer TrainingTool export validated locally on
 * 2026-09-26. It supplies detection counts only, never practical rubric facts.
 * The collector must establish attempt, exercise, time and image-hash provenance
 * separately: none of those fields is present in this native text export.
 */
export function parseSingleImageTrainingResult(bytes: Buffer, expected: TrainingResultBinding) {
  if (!Number.isSafeInteger(expected.imageId) || expected.imageId <= 0 ||
      !Number.isSafeInteger(expected.referenceTargetCount) || expected.referenceTargetCount < 0 ||
      !expected.viewerName || !expected.viewerId) {
    throw new Error("Invalid expected native result binding.");
  }
  if (!bytes.length || bytes.length > MAX_EXPORT_BYTES ||
      bytes.some(byte => byte !== 9 && byte !== 10 && byte !== 13 && (byte < 32 || byte > 126))) {
    throw new Error("Unsupported native result size or encoding.");
  }
  const text = bytes.toString("ascii");
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines.at(-1) === "") lines.pop();
  if (lines.length !== 3 || lines[1] !== COLUMN_HEADER) {
    throw new Error("Only a complete single-image, single-viewer export is supported.");
  }
  const header = /^"Viewer"\t\t"Image"\t([1-9]\d*)\t\t"Total"$/.exec(lines[0]);
  if (!header || !Number.isSafeInteger(Number(header[1])) || Number(header[1]) !== expected.imageId) {
    throw new Error("Native result image does not match the assigned image.");
  }
  const fields = lines[2].split("\t");
  if (fields.length !== 8) throw new Error("Native result row is incomplete or ambiguous.");
  const viewerName = identity(fields[0]), viewerId = identity(fields[1]);
  if (viewerName !== expected.viewerName || viewerId !== expected.viewerId) {
    throw new Error("Native result does not match the assigned viewer.");
  }
  const values = fields.slice(2).map(count);
  if (values.some((value, index) => index < 3 && value !== values[index + 3])) {
    throw new Error("Native totals disagree with the image counts.");
  }
  if (!Number.isSafeInteger(values[0] + values[2]) || values[0] + values[2] !== expected.referenceTargetCount) {
    throw new Error("Native result does not match the reference target count.");
  }
  const detections: TrainingDetectionCounts = { right: values[0], wrong: values[1], missed: values[2] };
  return {
    format: "scannex-trainingtool-single-image-v1" as const,
    imageId: expected.imageId,
    viewerName,
    viewerId,
    detections,
    sourceSha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
