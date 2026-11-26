export function isScannexHostedPilot(input: {
  environment?: string; enabled?: string; operator?: string;
  authenticatedEmail?: string; roles: readonly string[]; course: string; unit: string;
}) {
  const operator = input.operator?.trim().toLowerCase();
  return input.environment === "preview" && input.enabled === "1" && Boolean(operator)
    && input.authenticatedEmail?.trim().toLowerCase() === operator
    && input.roles.includes("admin") && input.course === "scannex-training-programme" && input.unit === "lu9";
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
