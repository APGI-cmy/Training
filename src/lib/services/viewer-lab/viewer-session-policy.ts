import { evaluateViewerLabAvailability, type ViewerLabSettings } from "./viewer-lab-policy";

export type ViewerSessionStatus = {
  status: "clear" | "retained" | "active" | "starting" | "unknown";
  canProceed: boolean;
  message: string;
  sourceUnitSlug?: string;
};

export const viewerSessionCheckUnavailable: ViewerSessionStatus = {
  status: "unknown",
  canProceed: false,
  message: "We could not verify that your Viewer session has ended. Use Profile → End session in the streaming window, then check again. If this continues, contact the training administrator."
};

export function canRetainViewerSession(settings: ViewerLabSettings, targetUnitSlug: string, sourceUnitSlug?: string, now = new Date()) {
  // Learners must be able to return to the unit they are currently practising.
  return targetUnitSlug === sourceUnitSlug || evaluateViewerLabAvailability(settings, targetUnitSlug, now).canLaunch;
}

export function viewerSessionProgressionStatus(running: boolean, launchExpiresAt: string, sourceUnitSlug: string, now = new Date()): ViewerSessionStatus {
  if (running) return {
    status: "active", canProceed: false, sourceUnitSlug,
    message: "Your Scannex Viewer session is still running. End the AWS streaming session before opening this learning unit. Closing its browser window or signing out of TrainingTool is not sufficient."
  };
  // A launch link can still start a session before AWS reports one. Allow a short
  // propagation interval after its expiry so a loading session cannot bypass the gate.
  if (now.getTime() < Date.parse(launchExpiresAt) + 60_000) return {
    status: "starting", canProceed: false, sourceUnitSlug,
    message: "Your Viewer launch is still being checked. If the streaming window opened, end its session. Wait a short moment, then check again."
  };
  return { status: "clear", canProceed: true, sourceUnitSlug, message: "Your Viewer session has ended. You can continue learning." };
}
