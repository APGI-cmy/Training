import { describe, expect, it, vi } from "vitest";
import { hasRunningViewerSession } from "../src/lib/services/viewer-lab/describe-viewer-sessions";
import { toViewerLabUserId } from "../src/lib/services/viewer-lab/create-viewer-lab-session";
import { defaultViewerLabSettings } from "../src/lib/services/viewer-lab/viewer-lab-policy";
import { canRetainViewerSession, viewerSessionProgressionStatus } from "../src/lib/services/viewer-lab/viewer-session-policy";
import type { ViewerLabConfig } from "../src/lib/services/viewer-lab/viewer-lab-config";

const learnerId = "4f4bd282-d471-4f93-90f5-7b2c24595d12";
const userId = toViewerLabUserId(learnerId);
const config: ViewerLabConfig = { enabled: true, region: "eu-west-1", stackName: "practice", fleetName: "practice", roleArn: "role", applicationId: "Viewer", sessionTtlSeconds: 60 };
const expiredLink = "2026-10-08T08:00:00Z";
const now = new Date("2026-10-08T08:10:00Z");

describe("Viewer session progression", () => {
  it.each(["ACTIVE", "PENDING"])("blocks a %s session even if its window was closed", async (state) => {
    const send = vi.fn().mockResolvedValue({ Sessions: [{ UserId: userId, State: state, ConnectionState: "NOT_CONNECTED" }] });
    const running = await hasRunningViewerSession(config, learnerId, { send });
    expect(viewerSessionProgressionStatus(running, expiredLink, "lu6", now).canProceed).toBe(false);
    expect(send.mock.calls[0][0].input).toMatchObject({ UserId: userId, AuthenticationType: "API", FleetName: "practice", StackName: "practice" });
  });
  it("unlocks after AWS reports the learner's session expired", async () => {
    const send = vi.fn().mockResolvedValue({ Sessions: [{ UserId: userId, State: "EXPIRED" }] });
    expect(viewerSessionProgressionStatus(await hasRunningViewerSession(config, learnerId, { send }), expiredLink, "lu6", now).canProceed).toBe(true);
  });
  it("checks later pages instead of treating the first empty page as logout", async () => {
    const send = vi.fn().mockResolvedValueOnce({ Sessions: [], NextToken: "page2" }).mockResolvedValueOnce({ Sessions: [{ UserId: userId, State: "ACTIVE" }] });
    expect(await hasRunningViewerSession(config, learnerId, { send })).toBe(true);
    expect(send.mock.calls[1][0].input.NextToken).toBe("page2");
  });
  it("does not infer logout from an AWS failure or malformed pagination", async () => {
    const failing = vi.fn().mockRejectedValue(new Error("AccessDenied"));
    await expect(hasRunningViewerSession(config, learnerId, { send: failing })).rejects.toThrow("AccessDenied");
    const looping = vi.fn().mockResolvedValue({ Sessions: [], NextToken: "same" });
    await expect(hasRunningViewerSession(config, learnerId, { send: looping })).rejects.toThrow("PAGINATION_FAILED");
  });
  it("keeps a launch in progress blocked until its link expires and AWS has had time to report it", () => {
    expect(viewerSessionProgressionStatus(false, "2026-10-08T08:10:30Z", "lu6", now).status).toBe("starting");
    expect(viewerSessionProgressionStatus(false, expiredLink, "lu6", now).status).toBe("clear");
  });
  it("lets learners retain the session for another enabled Viewer unit and return to the original unit", () => {
    const settings = { ...defaultViewerLabSettings, enabledUnitSlugs: ["lu6", "lu7"] };
    expect(canRetainViewerSession(settings, "lu7", "lu6", now)).toBe(true);
    expect(canRetainViewerSession(settings, "lu6", "lu6", now)).toBe(true);
    expect(canRetainViewerSession(settings, "lu8", "lu6", now)).toBe(false);
    expect(canRetainViewerSession({ ...settings, accessClosesAt: "2026-10-01T00:00:00Z" }, "lu7", "lu6", now)).toBe(false);
  });
});
