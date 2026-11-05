import {
  DescribeFleetsCommand,
  StartFleetCommand,
  UpdateFleetCommand
} from "@aws-sdk/client-appstream";
import type { ViewerLabConfig } from "@/lib/services/viewer-lab/viewer-lab-config";
import { createViewerLabClient } from "@/lib/services/viewer-lab/create-viewer-lab-session";
import { viewerFleetCapacity } from "./viewer-fleet-capacity";

export type ViewerLabWarmupResult = {
  status: "ready" | "starting" | "unavailable";
  message: string;
};

export async function warmViewerLab({
  config,
  desiredCapacity,
  warmupMinutes
}: {
  config: ViewerLabConfig;
  desiredCapacity: number;
  warmupMinutes: number;
}): Promise<ViewerLabWarmupResult> {
  const client = createViewerLabClient(config);
  try {
    const response = await client.send(new DescribeFleetsCommand({ Names: [config.fleetName] }));
    const fleet = response.Fleets?.[0];
    if (!fleet) return { status: "unavailable", message: "The Viewer environment could not be found. Please contact the training administrator." };

    if (fleet.State === "RUNNING") {
      const capacity = viewerFleetCapacity(fleet, desiredCapacity);
      const currentCapacity = capacity.desired ?? 0;
      if (currentCapacity < desiredCapacity) {
        await client.send(new UpdateFleetCommand({
          Name: config.fleetName,
          ComputeCapacity: capacity.multiSession ? { DesiredSessions: desiredCapacity } : { DesiredInstances: desiredCapacity }
        }));
      }
      return {
        status: capacity.ready ? "ready" : "starting",
        message: capacity.ready
          ? `AWS reports ${capacity.prepared} prepared Viewer places for a target of ${desiredCapacity}. Open the Viewer Lab when needed.`
          : `Preparing ${desiredCapacity} Viewer places. AWS currently reports ${capacity.prepared ?? 'an unknown number of'} prepared places. Allow up to ${warmupMinutes} minutes and check again. A capacity target alone is not a readiness confirmation.`
      };
    }

    if (fleet.State === "STOPPED") {
      const capacity = viewerFleetCapacity(fleet, desiredCapacity);
      if ((capacity.desired ?? 0) < desiredCapacity) {
        await client.send(new UpdateFleetCommand({
          Name: config.fleetName,
          ComputeCapacity: capacity.multiSession ? { DesiredSessions: desiredCapacity } : { DesiredInstances: desiredCapacity }
        }));
      }
      await client.send(new StartFleetCommand({ Name: config.fleetName }));
      return {
        status: "starting",
        message: `The Scannex Viewer is starting. This can take up to ${warmupMinutes} minutes; you may continue with the learning material while it prepares.`
      };
    }

    if (fleet.State === "STARTING") {
      return {
        status: "starting",
        message: `The Scannex Viewer is already starting. This can take up to ${warmupMinutes} minutes.`
      };
    }

    return {
      status: "unavailable",
      message: `The Viewer environment is currently ${String(fleet.State ?? "unavailable").toLowerCase()}. Please try again later or contact the training administrator.`
    };
  } catch (error) {
    console.error("viewer_lab_warmup_failed", {
      fleetName: config.fleetName,
      error: error instanceof Error ? error.name : "UnknownError"
    });
    return {
      status: "unavailable",
      message: "The Viewer could not be prepared automatically. Your learning material remains available; please contact the training administrator if you need Viewer access now."
    };
  } finally {
    client.destroy();
  }
}
