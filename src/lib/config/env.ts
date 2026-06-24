const requiredClientKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL"
] as const;

const requiredServerKeys = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "AIMC_GATEWAY_URL",
  "AIMC_GATEWAY_API_KEY",
  "CERTIFICATE_SIGNING_SECRET",
  "PRIVATE_FILE_BUCKET"
] as const;

type ClientEnvKey = (typeof requiredClientKeys)[number];
type ServerEnvKey = (typeof requiredServerKeys)[number];

type EnvValidationResult = {
  ok: boolean;
  missing: string[];
};

type AlpClientEnv = Record<ClientEnvKey, string | undefined>;

function getPublicClientSource(): AlpClientEnv {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
  };
}

function isSet(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function collectMissing(keys: readonly string[], source: Record<string, string | undefined>) {
  return keys.filter((key) => !isSet(source[key]));
}

export function validateClientEnv(
  source: Record<string, string | undefined> = getPublicClientSource()
): EnvValidationResult {
  const missing = collectMissing(requiredClientKeys, source);

  return {
    ok: missing.length === 0,
    missing
  };
}

export function validateServerEnv(
  source: NodeJS.ProcessEnv = process.env
): EnvValidationResult {
  const missing = collectMissing([...requiredClientKeys, ...requiredServerKeys], source);

  return {
    ok: missing.length === 0,
    missing
  };
}

export function validateSupabaseServerEnv(
  source: NodeJS.ProcessEnv = process.env
): EnvValidationResult {
  const missing = collectMissing(
    ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
    source
  );

  return {
    ok: missing.length === 0,
    missing
  };
}

export function getClientEnv(
  source: Record<string, string | undefined> = getPublicClientSource()
) {
  const validation = validateClientEnv(source);

  if (!validation.ok) {
    throw new Error(
      `Missing required public ALP environment variables: ${validation.missing.join(", ")}`
    );
  }

  return {
    supabaseUrl: source.NEXT_PUBLIC_SUPABASE_URL as string,
    supabaseAnonKey: source.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    appUrl: source.NEXT_PUBLIC_APP_URL as string
  } satisfies Record<string, string>;
}

export function getServerEnv(source: NodeJS.ProcessEnv = process.env) {
  const validation = validateServerEnv(source);

  if (!validation.ok) {
    throw new Error(
      `Missing required ALP server environment variables: ${validation.missing.join(", ")}`
    );
  }

  return {
    ...getClientEnv(source),
    supabaseServiceRoleKey: source.SUPABASE_SERVICE_ROLE_KEY as string,
    stripeSecretKey: source.STRIPE_SECRET_KEY as string,
    stripeWebhookSecret: source.STRIPE_WEBHOOK_SECRET as string,
    aimcGatewayUrl: source.AIMC_GATEWAY_URL as string,
    aimcGatewayApiKey: source.AIMC_GATEWAY_API_KEY as string,
    certificateSigningSecret: source.CERTIFICATE_SIGNING_SECRET as string,
    privateFileBucket: source.PRIVATE_FILE_BUCKET as string
  } satisfies Record<string, string>;
}

export type { ClientEnvKey, EnvValidationResult, ServerEnvKey };
