import {
  AppStreamClient,
  CreateStreamingURLCommand,
  type CreateStreamingURLCommandInput
} from "@aws-sdk/client-appstream";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";
import type { ViewerLabConfig } from "@/lib/services/viewer-lab/viewer-lab-config";

type ViewerLabSession = {
  streamingUrl: string;
  expiresAt?: Date;
};

export function buildViewerLabSessionInput({
  config,
  learnerId,
  courseSlug,
  unitSlug
}: {
  config: ViewerLabConfig;
  learnerId: string;
  courseSlug: string;
  unitSlug: string;
}): CreateStreamingURLCommandInput {
  return {
    StackName: config.stackName,
    FleetName: config.fleetName,
    UserId: learnerId,
    ApplicationId: config.applicationId,
    Validity: config.sessionTtlSeconds,
    SessionContext: JSON.stringify({
      mode: "training-practice",
      courseSlug,
      unitSlug
    })
  };
}

export async function createViewerLabSession({
  config,
  learnerId,
  courseSlug,
  unitSlug
}: {
  config: ViewerLabConfig;
  learnerId: string;
  courseSlug: string;
  unitSlug: string;
}): Promise<ViewerLabSession> {
  const client = new AppStreamClient({
    region: config.region,
    credentials: awsCredentialsProvider({
      roleArn: config.roleArn,
      clientConfig: { region: config.region },
      roleSessionName: "apgi-scannex-viewer-lab"
    })
  });

  try {
    const response = await client.send(
      new CreateStreamingURLCommand(
        buildViewerLabSessionInput({ config, learnerId, courseSlug, unitSlug })
      )
    );

    if (!response.StreamingURL) {
      throw new Error("AWS did not return a streaming URL.");
    }

    return {
      streamingUrl: response.StreamingURL,
      expiresAt: response.Expires
    };
  } finally {
    client.destroy();
  }
}
