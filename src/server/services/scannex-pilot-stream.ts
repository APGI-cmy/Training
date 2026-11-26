import "server-only";
import { AppStreamClient, CreateImageBuilderStreamingURLCommand } from "@aws-sdk/client-appstream";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";
import { privateIrelandViewerUrl } from "@/lib/assessments/scannex-hosted-pilot";

const REGION = "eu-west-1";
const BUILDER = "apgi-scannex-dev-builder";
const PILOT_ROLE = /^arn:aws:iam::[0-9]{12}:role\/apgi-v1-scannex-dev-pilot-stream$/;

export function devPilotStreamingRole(value = process.env.SCANNEX_V1_PILOT_AWS_ROLE_ARN): string | null {
  const arn = value?.trim();
  return arn && PILOT_ROLE.test(arn) ? arn : null;
}

export async function issueDevPilotStream(roleArn: string) {
  if (!PILOT_ROLE.test(roleArn)) throw new Error("Dedicated pilot streaming role required");
  const client = new AppStreamClient({
    region: REGION,
    maxAttempts: 1,
    credentials: awsCredentialsProvider({
      roleArn,
      clientConfig: { region: REGION },
      roleSessionName: "apgi-scannex-image78-pilot",
    }),
  });
  try {
    const command = new CreateImageBuilderStreamingURLCommand({ Name: BUILDER, Validity: 120 });
    const reply = await client.send(command, { abortSignal: AbortSignal.timeout(10_000) });
    const target = privateIrelandViewerUrl(reply.StreamingURL ?? "");
    if (!target) throw new Error("Unexpected pilot streaming URL");
    return target.href;
  } finally {
    client.destroy();
  }
}
