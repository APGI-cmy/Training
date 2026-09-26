import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSingleImageTrainingResult } from "../../src/server/assessments/scannex-training-result";

const missed = readFileSync(new URL("./native-fixtures/calibration-missed.txt", import.meta.url));
const mixed = readFileSync(new URL("./native-fixtures/calibration-mixed.txt", import.meta.url));
const binding = { imageId: 12, viewerName: "TestName", viewerId: "TestID", referenceTargetCount: 1 };

describe("genuine single-image TrainingTool exports", () => {
  it.each([
    ["missed", missed, { right: 0, wrong: 0, missed: 1 }, "38526d5ff6fc34ec17148041ec08dcfab86301771b3e56994c21174fb700c248"],
    ["mixed", mixed, { right: 1, wrong: 1, missed: 0 }, "49b98e84e3cd638fb0cc65b1162cc53846f4b1d8371d48f09979078f430d9551"],
  ] as const)("matches the observed %s result and exact original bytes", (_name, bytes, detections, sourceSha256) => {
    expect(parseSingleImageTrainingResult(bytes, binding)).toEqual({
      format: "scannex-trainingtool-single-image-v1", imageId: 12,
      viewerName: "TestName", viewerId: "TestID", detections, sourceSha256,
    });
  });

  it.each([
    { imageId: 11 }, { viewerId: "another-learner" }, { viewerName: "Another name" },
    { referenceTargetCount: 2 }, { imageId: NaN }, { referenceTargetCount: -1 }, { viewerId: "" },
  ])("rejects a result against a different or invalid assignment: %j", change => {
    expect(() => parseSingleImageTrainingResult(mixed, { ...binding, ...change })).toThrow();
  });

  it.each([
    ["truncated", (text: string) => text.split("\r\n").slice(0, 2).join("\r\n")],
    ["duplicate viewer", (text: string) => text + text.split("\r\n")[2] + "\r\n"],
    ["extra blank row", (text: string) => text + "\r\n"],
    ["column order", (text: string) => text.replace('"Right"\t"Wrong"', '"Wrong"\t"Right"')],
    ["multiple images", (text: string) => text.replace('"Total"', '"Image"\t13\t\t"Total"')],
    ["negative count", (text: string) => text.replace('"TestID"\t1', '"TestID"\t-1')],
    ["fractional count", (text: string) => text.replace('"TestID"\t1', '"TestID"\t1.5')],
    ["numeric overflow", (text: string) => text.replace('"TestID"\t1', '"TestID"\t9007199254740992')],
    ["blank count", (text: string) => text.replace('"TestID"\t1', '"TestID"\t')],
    ["inconsistent total", (text: string) => text.replace(/1\t1\t0\r\n$/, "1\t2\t0\r\n")],
    ["unquoted identity", (text: string) => text.replace('"TestID"', 'TestID')],
    ["embedded identity quote", (text: string) => text.replace('"TestID"', '"Test"ID"')],
    ["NUL byte", (text: string) => text + "\0"],
    ["unsupported encoding", (text: string) => text.replace("TestName", "TéstName")],
    ["additional column", (text: string) => text.trimEnd() + "\t1\r\n"],
  ] as const)("rejects malformed or unvalidated format: %s", (_name, mutate) => {
    expect(() => parseSingleImageTrainingResult(Buffer.from(mutate(mixed.toString("ascii"))), binding)).toThrow();
  });

  it("rejects an oversized input before parsing", () => {
    expect(() => parseSingleImageTrainingResult(Buffer.alloc(16 * 1024 + 1, 32), binding)).toThrow();
  });

  it("does not invent exercise, timing, movement or practical-scoring evidence", () => {
    const parsed = parseSingleImageTrainingResult(mixed, binding);
    expect(Object.keys(parsed).sort()).toEqual(["detections", "format", "imageId", "sourceSha256", "viewerId", "viewerName"]);
  });
});
