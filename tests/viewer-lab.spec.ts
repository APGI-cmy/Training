import { describe, expect, it } from "vitest";
import {
  buildViewerLabSessionInput,
  toViewerLabUserId
} from "../src/lib/services/viewer-lab/create-viewer-lab-session";
import { getViewerLabConfig, isViewerLabConfigured } from "../src/lib/services/viewer-lab/viewer-lab-config";

describe("Scannex Viewer Lab", () => {
  it("stays unavailable until all AWS learner-environment settings are present", () => {
    expect(isViewerLabConfigured({ SCANNEX_VIEWER_LAB_ENABLED: "true" })).toBe(false);
    expect(getViewerLabConfig({
      SCANNEX_VIEWER_LAB_ENABLED: "false",
      SCANNEX_VIEWER_LAB_REGION: "eu-west-1",
      SCANNEX_VIEWER_LAB_STACK_NAME: "stack",
      SCANNEX_VIEWER_LAB_FLEET_NAME: "fleet",
      AWS_ROLE_ARN: "arn:aws:iam::216511318705:role/apgi-viewer-lab-launcher"
    })).toBeNull();
  });

  it("builds a short-lived practice session without learner email or AWS credentials", () => {
    const config = getViewerLabConfig({
      SCANNEX_VIEWER_LAB_ENABLED: "true",
      SCANNEX_VIEWER_LAB_REGION: "eu-west-1",
      SCANNEX_VIEWER_LAB_STACK_NAME: "apgi-scannex-practice",
      SCANNEX_VIEWER_LAB_FLEET_NAME: "apgi-scannex-practice",
      SCANNEX_VIEWER_LAB_APPLICATION_ID: "ScannexViewer",
      AWS_ROLE_ARN: "arn:aws:iam::216511318705:role/apgi-viewer-lab-launcher"
    });

    expect(config).not.toBeNull();

    const input = buildViewerLabSessionInput({
      config: config!,
      learnerId: "4f4bd282-d471-4f93-90f5-7b2c24595d12",
      courseSlug: "scannex-training-programme",
      unitSlug: "lu6"
    });

    expect(input).toMatchObject({
      StackName: "apgi-scannex-practice",
      FleetName: "apgi-scannex-practice",
      ApplicationId: "ScannexViewer",
      UserId: "4f4bd282d4714f9390f57b2c24595d12",
      Validity: 60
    });
    expect(input.SessionContext).toBe(JSON.stringify({
      mode: "training-practice",
      courseSlug: "scannex-training-programme",
      unitSlug: "lu6"
    }));
    expect(JSON.stringify(input)).not.toContain("AWS_SECRET_ACCESS_KEY");
    expect(JSON.stringify(input)).not.toContain("@");
  });

  it("creates a stable AppStream user identifier within the 32-character limit", () => {
    expect(toViewerLabUserId("4f4bd282-d471-4f93-90f5-7b2c24595d12")).toBe(
      "4f4bd282d4714f9390f57b2c24595d12"
    );
    expect(toViewerLabUserId("learner-id-that-is-far-too-long-for-appstream")).toMatch(
      /^[a-f0-9]{32}$/
    );
  });

  it("rejects an unsafe session URL lifetime and restores the short default", () => {
    const config = getViewerLabConfig({
      SCANNEX_VIEWER_LAB_ENABLED: "true",
      SCANNEX_VIEWER_LAB_REGION: "eu-west-1",
      SCANNEX_VIEWER_LAB_STACK_NAME: "stack",
      SCANNEX_VIEWER_LAB_FLEET_NAME: "fleet",
      SCANNEX_VIEWER_LAB_APPLICATION_ID: "ScannexViewer",
      AWS_ROLE_ARN: "arn:aws:iam::216511318705:role/apgi-viewer-lab-launcher",
      SCANNEX_VIEWER_LAB_SESSION_TTL_SECONDS: "9999999"
    });

    expect(config?.sessionTtlSeconds).toBe(60);
  });
});
