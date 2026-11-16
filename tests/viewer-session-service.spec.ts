import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rest: vi.fn(), running: vi.fn(), settings: vi.fn(), config: vi.fn() }));
vi.mock("@/server/supabase/admin-rest", () => ({ adminRest: mocks.rest }));
vi.mock("../src/lib/services/viewer-lab/describe-viewer-sessions", () => ({ hasRunningViewerSession: mocks.running }));
vi.mock("../src/lib/services/viewer-lab/viewer-lab-settings", () => ({ getViewerLabSettings: mocks.settings }));
vi.mock("../src/lib/services/viewer-lab/viewer-lab-config", () => ({ getViewerLabConfig: mocks.config }));

import { getViewerSessionStatus } from "../src/lib/services/viewer-lab/get-viewer-session-status";
import { defaultViewerLabSettings } from "../src/lib/services/viewer-lab/viewer-lab-policy";

const launch = { unit_slug: "lu6", started_at: "2026-01-01T00:00:00Z", metadata: { launch_expires_at: "2026-01-01T00:01:00Z" } };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.settings.mockResolvedValue(defaultViewerLabSettings);
  mocks.config.mockReturnValue({ sessionTtlSeconds: 60 });
  mocks.rest.mockResolvedValue({ ok: true, json: async () => [launch] });
});

describe("Viewer entry checks", () => {
  it("does not require logout or an AWS call when the learner never launched a Viewer", async () => {
    mocks.rest.mockResolvedValue({ ok: true, json: async () => [] });
    expect((await getViewerSessionStatus("learner-a", "lu7")).canProceed).toBe(true);
    expect(mocks.running).not.toHaveBeenCalled();
  });
  it("checks only the authenticated learner's launch and AWS session", async () => {
    mocks.running.mockResolvedValue(true);
    const result = await getViewerSessionStatus("learner-a", "lu7");
    expect(result.status).toBe("active");
    expect(mocks.rest.mock.calls[0][0]).toContain("user_id=eq.learner-a");
    expect(mocks.running.mock.calls[0][1]).toBe("learner-a");
  });
  it("allows the same session in an admin-enabled next unit", async () => {
    mocks.settings.mockResolvedValue({ ...defaultViewerLabSettings, enabledUnitSlugs: ["lu6", "lu7"] });
    expect((await getViewerSessionStatus("learner-a", "lu7")).status).toBe("retained");
    expect(mocks.running).not.toHaveBeenCalled();
  });
  it("withholds progression on AWS errors, missing configuration and unavailable launch history", async () => {
    mocks.running.mockRejectedValue(new Error("AWS denied"));
    expect((await getViewerSessionStatus("learner-a", "lu7")).canProceed).toBe(false);
    mocks.config.mockReturnValue(null);
    expect((await getViewerSessionStatus("learner-a", "lu7")).status).toBe("unknown");
    mocks.rest.mockResolvedValue({ ok: false });
    expect((await getViewerSessionStatus("learner-a", "lu7")).status).toBe("unknown");
  });
  it("allows progression after AWS confirms no session remains", async () => {
    mocks.running.mockResolvedValue(false);
    expect((await getViewerSessionStatus("learner-a", "lu7")).status).toBe("clear");
  });
});
