import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({
  session: vi.fn(), roles: vi.fn(), access: vi.fn(), send: vi.fn(), destroy: vi.fn(), client: vi.fn(),
}));
vi.mock("@/server/auth/session", () => ({ getCurrentSession: stub.session, getUserRoles: stub.roles }));
vi.mock("@/lib/services/enrolments/get-course-access", () => ({ getCourseAccess: stub.access }));
vi.mock("@vercel/oidc-aws-credentials-provider", () => ({ awsCredentialsProvider: vi.fn(() => () => ({})) }));
vi.mock("@aws-sdk/client-appstream", () => ({
  AppStreamClient: class {
    constructor(config: unknown) { stub.client(config); }
    send = stub.send;
    destroy = stub.destroy;
  },
  CreateImageBuilderStreamingURLCommand: class { constructor(public readonly input: unknown) {} },
}));

import { POST } from "../app/api/v1/scannex-pilot/launch/route";
import { devPilotStreamingRole } from "@/server/services/scannex-pilot-stream";

const host = "https://preview.example.test";
const operator = "operator@example.test";
const role = "arn:aws:iam::123456789012:role/apgi-v1-scannex-dev-pilot-stream";
const awsUrl = "https://appstream2.eu-west-1.aws.amazon.com/authenticate?parameters=opaque&signature=test";
const from = (origin = host, site = "same-origin") => new Request(host + "/api/v1/scannex-pilot/launch", {
  method: "POST", headers: { Origin: origin, "Sec-Fetch-Site": site },
  body: JSON.stringify({ Name: "apgi-scannex-lu6-8-practice-compat-20261109" }),
});

describe("private V1 Viewer one-click launch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("SCANNEX_V1_IMAGE78_PILOT", "1");
    vi.stubEnv("SCANNEX_V1_PILOT_OPERATOR", operator);
    vi.stubEnv("SCANNEX_V1_PILOT_AWS_ROLE_ARN", role);
    stub.session.mockResolvedValue({ user: { id: "operator-id", email: operator }, accessToken: "fake-access-token" });
    stub.roles.mockResolvedValue(["admin"]);
    stub.access.mockResolvedValue({ canAccess: true });
    stub.send.mockResolvedValue({ StreamingURL: awsUrl });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("only requests a short-lived link to the exact Ireland development builder", async () => {
    const response = await POST(from());
    expect(await response.json()).toEqual({ streamingUrl: awsUrl });
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(stub.client).toHaveBeenCalledWith(expect.objectContaining({ region: "eu-west-1", maxAttempts: 1 }));
    expect(stub.send).toHaveBeenCalledWith(expect.objectContaining({
      input: { Name: "apgi-scannex-dev-builder", Validity: 120 },
    }), expect.objectContaining({ abortSignal: expect.any(AbortSignal) }));
    expect(stub.destroy).toHaveBeenCalledOnce();
  });

  it("rejects production, cross-origin calls, sign-out, another admin and denied enrolment before contacting AWS", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect((await POST(from())).status).toBe(404);
    vi.stubEnv("VERCEL_ENV", "preview");
    expect((await POST(from("https://other.example.test"))).status).toBe(403);
    expect((await POST(from(host, "cross-site"))).status).toBe(403);
    stub.session.mockResolvedValueOnce(null);
    expect((await POST(from())).status).toBe(401);
    stub.session.mockResolvedValueOnce({ user: { id: "someone-else", email: "someone@example.test" }, accessToken: "fake" });
    expect((await POST(from())).status).toBe(403);
    stub.roles.mockResolvedValueOnce(["learner"]);
    expect((await POST(from())).status).toBe(403);
    stub.access.mockResolvedValueOnce({ canAccess: false });
    expect((await POST(from())).status).toBe(403);
    expect(stub.send).not.toHaveBeenCalled();
  });

  it("fails closed if the dedicated role is missing or a cloud response is unexpected", async () => {
    vi.stubEnv("SCANNEX_V1_PILOT_AWS_ROLE_ARN", "arn:aws:iam::123456789012:role/practice");
    expect(devPilotStreamingRole()).toBeNull();
    expect((await POST(from())).status).toBe(503);
    expect(stub.send).not.toHaveBeenCalled();
    vi.stubEnv("SCANNEX_V1_PILOT_AWS_ROLE_ARN", role);
    stub.send.mockResolvedValueOnce({ StreamingURL: "https://other.example.test/?signature=do-not-expose" });
    const unexpected = await POST(from());
    expect(unexpected.status).toBe(503);
    expect(await unexpected.text()).not.toContain("do-not-expose");
  });
});
