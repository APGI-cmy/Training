export const SCANNEX_PILOT_COURSE = "scannex-training-programme";
export const SCANNEX_PILOT_UNIT = "lu9";
export const SCANNEX_PILOT_LAUNCH = "/api/v1/scannex-pilot/launch";
export const SCANNEX_LEARNER_TEST = "learner-test";
export const SCANNEX_TEST_CASES = [1, 2, 3] as const;

export function isHostedPilotDeployment(source: Record<string, string | undefined>) {
  return source.VERCEL_ENV === "preview" && source.SCANNEX_V1_IMAGE78_PILOT === "1";
}

export function isScannexHostedPilot(input: {
  environment?: string; enabled?: string; operator?: string;
  authenticatedEmail?: string; roles: readonly string[]; course: string; unit: string;
}) {
  const operator = input.operator?.trim().toLowerCase();
  return input.environment === "preview" && input.enabled === "1" && Boolean(operator)
    && input.authenticatedEmail?.trim().toLowerCase() === operator
    && input.roles.includes("admin") && input.course === SCANNEX_PILOT_COURSE && input.unit === SCANNEX_PILOT_UNIT;
}

export function privateIrelandViewerUrl(input: string) {
  if (input.length > 20_000) return null;
  try {
    const u = new URL(input.trim());
    const keys = [...u.searchParams.keys()].sort().join(",");
    return u.origin === "https://appstream2.eu-west-1.aws.amazon.com" && u.pathname === "/authenticate"
      && !u.username && !u.password && !u.hash && keys === "parameters,signature"
      && u.searchParams.get("parameters") && u.searchParams.get("signature") ? u : null;
  } catch { return null; }
}
