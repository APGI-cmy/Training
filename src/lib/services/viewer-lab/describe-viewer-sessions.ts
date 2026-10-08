import { DescribeSessionsCommand, type DescribeSessionsCommandOutput } from "@aws-sdk/client-appstream";
import { createViewerLabClient, toViewerLabUserId } from "./create-viewer-lab-session";
import type { ViewerLabConfig } from "./viewer-lab-config";

type SessionReader = {
  send: (command: DescribeSessionsCommand) => Promise<DescribeSessionsCommandOutput>;
};

// A disconnected stream is still running. Only EXPIRED sessions can be ignored.
export async function hasRunningViewerSession(config: ViewerLabConfig, learnerId: string, reader?: SessionReader) {
  const client = reader ?? createViewerLabClient(config);
  const userId = toViewerLabUserId(learnerId);
  const seenTokens = new Set<string>();
  let nextToken: string | undefined;
  try {
    do {
      const response = await client.send(new DescribeSessionsCommand({
        StackName: config.stackName,
        FleetName: config.fleetName,
        AuthenticationType: "API",
        UserId: userId,
        Limit: 50,
        NextToken: nextToken
      }));
      if (response.Sessions?.some((session) => session.UserId === userId && session.State !== "EXPIRED")) return true;
      nextToken = response.NextToken;
      if (nextToken && seenTokens.has(nextToken)) throw new Error("VIEWER_SESSION_PAGINATION_FAILED");
      if (nextToken) seenTokens.add(nextToken);
    } while (nextToken);
    return false;
  } finally {
    if (!reader) (client as ReturnType<typeof createViewerLabClient>).destroy();
  }
}
