import { describe, expect, it } from "vitest";
import { isScannexHostedPilot, privateIrelandViewerUrl } from "../src/lib/assessments/scannex-hosted-pilot";
import { openScannexPilotTransport } from "../src/components/assessment/scannex-pilot-transport";
import type { PracticalWorkspace } from "../src/components/assessment/PracticalAssignment";

const allowed = {
  environment: "preview", enabled: "1", operator: "operator@example.test",
  authenticatedEmail: "operator@example.test", roles: ["admin"], course: "scannex-training-programme", unit: "lu9",
};
describe("signed-in V1 Image 78 preview", () => {
  it("is off in production and requires the exact approved APGI admin and LU9", () => {
    expect(isScannexHostedPilot(allowed)).toBe(true);
    for (const rejected of [{ environment: "production" }, { enabled: undefined }, { operator: undefined }, { authenticatedEmail: undefined },
      { authenticatedEmail: "someone@example.test" }, { roles: ["learner"] }, { unit: "lu8" }, { course: "other" }]) {
      expect(isScannexHostedPilot({ ...allowed, ...rejected })).toBe(false);
    }
  });
  it("only accepts a signed Ireland AWS streaming link", () => {
    const url = "https://appstream2.eu-west-1.aws.amazon.com/authenticate?parameters=test&signature=test";
    expect(privateIrelandViewerUrl(url)?.hostname).toBe("appstream2.eu-west-1.aws.amazon.com");
    for (const bad of [url.replace("eu-west-1", "eu-west-2"), url.replace("/authenticate", "/console"), url + "&signature=duplicate", url + "#fragment",
      "https://appstream2.eu-west-1.aws.amazon.com@example.test/authenticate?parameters=test&signature=test"]) {
      expect(privateIrelandViewerUrl(bad)).toBeNull();
    }
  });
  it("completes local save and playback without requesting a server or permitting submission", async () => {
    const pilot = openScannexPilotTransport();
    const start = await pilot.request<PracticalWorkspace>();
    expect(start.pack?.learner_cases).toHaveLength(1);
    const id = start.assignment!.id;
    const opened = await pilot.request<PracticalWorkspace>("", { operation: "start", id });
    const image = opened.pack!.learner_cases[0];
    await pilot.request("", { operation: "save", id, expectedVersion: 0, document: opened.assignment!.document });
    const file = new File(["pilot-only"], "clip.webm", { type: "video/webm" });
    const fields = { assignmentId: id, caseId: image.id, kind: "recording", recordingNoticeAccepted: true };
    await expect(pilot.upload(file, { ...fields, caseId: "another-case" }, () => {})).rejects.toThrow();
    const evidence = await pilot.upload(file, fields, () => {});
    expect(pilot.evidence(evidence.id)).toBe(file);
    await expect(pilot.request("", { operation: "submit", id })).rejects.toThrow();
    expect((await pilot.request<PracticalWorkspace>()).submissions).toHaveLength(0);
    pilot.clearEvidence();
    expect(pilot.evidence(evidence.id)).toBeUndefined();
  });
});
