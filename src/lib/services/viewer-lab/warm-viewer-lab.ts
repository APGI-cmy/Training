import {
  DescribeFleetsCommand,
  StartFleetCommand,
  UpdateFleetCommand
} from "@aws-sdk/client-appstream";
import type { ViewerLabConfig } from "@/lib/services/viewer-lab/viewer-lab-config";
import { createViewerLabClient } from "@/lib/services/viewer-lab/create-viewer-lab-session";

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
      const currentCapacity = fleet.ComputeCapacityStatus?.Desired ?? 0;
      if (currentCapacity !== desiredCapacity) {
        await client.send(new UpdateFleetCommand({
          Name: config.fleetName,
          ComputeCapacity: { DesiredInstances: desiredCapacity }
        }));
      }
      return {
        status: "ready",
        message: currentCapacity < desiredCapacity
          ? `Viewer capacity is increasing to ${desiredCapacity} places. A new place may take up to ${warmupMinutes} minutes.`
          : "The Scannex Viewer is ready. Open it from the Viewer Lab panel when you need it."
      };
    }

    if (fleet.State === "STOPPED") {
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
