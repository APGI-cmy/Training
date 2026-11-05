import "server-only";
import { DescribeFleetsCommand } from "@aws-sdk/client-appstream";
import { createViewerLabClient } from "./create-viewer-lab-session";
import { getViewerLabConfig } from "./viewer-lab-config";
import { viewerFleetCapacity } from "./viewer-fleet-capacity";

export async function inspectViewerFleet(target: number) {
  const checkedAt = new Date().toISOString();
  const config = getViewerLabConfig();
  if (!config) return { checkedAt, error: "The production Viewer configuration is incomplete.", capacity: null };
  const client = createViewerLabClient(config);
  try {
    const response = await client.send(new DescribeFleetsCommand({ Names: [config.fleetName] }));
    const fleet = response.Fleets?.[0];
    return fleet ? { checkedAt, error: null, capacity: viewerFleetCapacity(fleet, target) }
      : { checkedAt, error: "AWS did not return the configured fleet.", capacity: null };
  } catch (error) {
    return { checkedAt, error: `AWS readiness could not be confirmed (${error instanceof Error ? error.name : 'connection error'}). No ready result is inferred.`, capacity: null };
  } finally { client.destroy(); }
}
