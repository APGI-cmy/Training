import { afterEach, describe, expect, it, vi } from "vitest";
import { platformSourceCommit } from "@/lib/platform-release";
import { watchdogCommit } from "@/server/security-watchdog/runner";

const source = "42da08dfcb0d0185a20282fb74294f8b8356dd8d";
const different = "e6b75f76a4f284bab14f22fccd55688c678768e8";

afterEach(() => vi.unstubAllEnvs());

describe("Watchdog deployment source", () => {
  it("uses the release stamp when a file upload leaves the Vercel Git variable blank", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "");
    vi.stubEnv("ALP_BUILD_SOURCE_COMMIT", source);
    expect(platformSourceCommit()).toBe(source);
    expect(watchdogCommit()).toBe(source);
  });

  it("keeps direct Git deployments working", () => {
    expect(platformSourceCommit(source.toUpperCase(), "")).toBe(source);
    expect(platformSourceCommit(source, source)).toBe(source);
  });

  it("refuses conflicting full commit identities or a missing commit on Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", different);
    vi.stubEnv("ALP_BUILD_SOURCE_COMMIT", source);
    expect(platformSourceCommit()).toBeNull();
    expect(watchdogCommit).toThrow("The deployed source commit could not be verified.");

    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "");
    vi.stubEnv("ALP_BUILD_SOURCE_COMMIT", "");
    expect(platformSourceCommit()).toBeNull();
    expect(watchdogCommit).toThrow("The deployed source commit could not be verified.");
  });
});
