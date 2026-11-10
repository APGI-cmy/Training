import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rest: vi.fn(), running: vi.fn() }));
vi.mock("@/server/supabase/admin-rest", () => ({ adminRest: mocks.rest }));
vi.mock("../src/lib/services/viewer-lab/describe-viewer-sessions", () => ({ hasRunningViewerSession: mocks.running }));
import { getViewerSessionStatus } from "../src/lib/services/viewer-lab/get-viewer-session-status";

describe("Independent Viewer and training navigation — owner direction 10 November", () => {
  it.each(["lu1", "lu2", "lu3", "lu4", "lu5", "lu6", "lu7", "lu8", "lu9"])("allows %s without requiring a session-end check", async (unit) => {
    expect(await getViewerSessionStatus("signed-in-learner", unit)).toMatchObject({ canProceed: true, status: "retained" });
    expect(mocks.running).not.toHaveBeenCalled();
    expect(mocks.rest).not.toHaveBeenCalled();
  });
});
