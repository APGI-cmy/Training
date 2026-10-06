const DEFAULT_SESSION_TTL_SECONDS = 60;

export type ViewerLabConfig = {
  enabled: boolean;
  region: string;
  stackName: string;
  fleetName: string;
  roleArn: string;
  applicationId?: string;
  sessionTtlSeconds: number;
};

function hasValue(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

function parseSessionTtl(value: string | undefined) {
  if (!hasValue(value)) return DEFAULT_SESSION_TTL_SECONDS;

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 604_800) {
    return DEFAULT_SESSION_TTL_SECONDS;
  }

  return parsed;
}

export function getViewerLabConfig(
  source: Record<string, string | undefined> = process.env
): ViewerLabConfig | null {
  const enabled = parseEnabled(source.SCANNEX_VIEWER_LAB_ENABLED);
  const region = source.SCANNEX_VIEWER_LAB_REGION?.trim();
  const stackName = source.SCANNEX_VIEWER_LAB_STACK_NAME?.trim();
  const fleetName = source.SCANNEX_VIEWER_LAB_FLEET_NAME?.trim();
  const roleArn = source.AWS_ROLE_ARN?.trim();

  if (!enabled || !region || !stackName || !fleetName || !roleArn) {
    return null;
  }

  const applicationId = source.SCANNEX_VIEWER_LAB_APPLICATION_ID?.trim();

  return {
    enabled,
    region,
    stackName,
    fleetName,
    roleArn,
    applicationId: applicationId || undefined,
    sessionTtlSeconds: parseSessionTtl(source.SCANNEX_VIEWER_LAB_SESSION_TTL_SECONDS)
  };
}

export function isViewerLabConfigured(source: Record<string, string | undefined> = process.env) {
  return getViewerLabConfig(source) !== null;
}
