import { describe, expect, it } from "vitest";

import {
  defaultViewerLabSettings,
  evaluateViewerLabAvailability,
  recommendedViewerCapacity,
  viewerCostAllowanceCents
} from "../src/lib/services/viewer-lab/viewer-lab-policy";
import { defaultCourseCommerceSetting, payableCoursePriceCents } from "../src/lib/commerce";

describe("Scannex Viewer policy", () => {
  it("adds the Viewer estimate and ten-percent Viewer-only tolerance to the USD 300 fee", () => {
    expect(viewerCostAllowanceCents(defaultViewerLabSettings)).toBe(573);
    expect(payableCoursePriceCents(defaultCourseCommerceSetting("scannex-training-programme"))).toBe(30_573);
    expect(payableCoursePriceCents(defaultCourseCommerceSetting("vpshr-level-0"))).toBe(12_000);
  });

  it("applies Viewer preparation only to selected Scannex learning units", () => {
    expect(evaluateViewerLabAvailability(defaultViewerLabSettings, "lu6").canLaunch).toBe(true);
    expect(evaluateViewerLabAvailability(defaultViewerLabSettings, "lu5")).toMatchObject({
      appliesToUnit: false,
      code: "not-required"
    });
  });

  it("explains course-window restrictions to the learner", () => {
    const settings = { ...defaultViewerLabSettings, accessClosesAt: "2026-10-01T00:00:00.000Z" };
    expect(evaluateViewerLabAvailability(settings, "lu6", new Date("2026-10-07T00:00:00.000Z"))).toMatchObject({
      canLaunch: false,
      code: "closed"
    });
  });

  it("uses enrolments, expected concurrency and a safety buffer for recommended capacity", () => {
    expect(recommendedViewerCapacity(defaultViewerLabSettings, 20)).toBe(8);
  });
});
