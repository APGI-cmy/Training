export const SCANNEX_COURSE_ID = "scannex-training-programme";

export type ViewerLabSettings = {
  courseId: string;
  enabled: boolean;
  enabledUnitSlugs: string[];
  accessOpensAt: string | null;
  accessClosesAt: string | null;
  estimatedCostPerLearnerCents: number;
  additionalSessionCostCents: number;
  toleranceBps: number;
  minimumReadyCapacity: number;
  maximumCapacity: number;
  expectedConcurrencyBps: number;
  capacityBuffer: number;
  warmupMinutes: number;
};

export const defaultViewerLabSettings: ViewerLabSettings = {
  courseId: SCANNEX_COURSE_ID,
  enabled: true,
  enabledUnitSlugs: ["lu6"],
  accessOpensAt: null,
  accessClosesAt: null,
  estimatedCostPerLearnerCents: 521,
  additionalSessionCostCents: 11,
  toleranceBps: 1000,
  minimumReadyCapacity: 1,
  maximumCapacity: 20,
  expectedConcurrencyBps: 3000,
  capacityBuffer: 2,
  warmupMinutes: 20
};

export type ViewerLabAvailability = {
  appliesToUnit: boolean;
  canLaunch: boolean;
  code: "available" | "disabled" | "not-open" | "closed" | "not-required";
  message: string;
};

export function evaluateViewerLabAvailability(
  settings: ViewerLabSettings,
  unitSlug: string,
  now = new Date()
): ViewerLabAvailability {
  if (!settings.enabledUnitSlugs.includes(unitSlug)) {
    return { appliesToUnit: false, canLaunch: false, code: "not-required", message: "The Scannex Viewer is not required for this learning unit." };
  }
  if (!settings.enabled) {
    return { appliesToUnit: true, canLaunch: false, code: "disabled", message: "The Scannex Viewer is temporarily unavailable. Your course progress is unaffected." };
  }
  if (settings.accessOpensAt && now < new Date(settings.accessOpensAt)) {
    return { appliesToUnit: true, canLaunch: false, code: "not-open", message: `Viewer access opens on ${new Date(settings.accessOpensAt).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}.` };
  }
  if (settings.accessClosesAt && now >= new Date(settings.accessClosesAt)) {
    return { appliesToUnit: true, canLaunch: false, code: "closed", message: `Viewer access closed on ${new Date(settings.accessClosesAt).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}. Contact the training administrator if you require an extension.` };
  }
  return { appliesToUnit: true, canLaunch: true, code: "available", message: `The Scannex Viewer is available for this unit. Allow up to ${settings.warmupMinutes} minutes if AWS needs to prepare capacity.` };
}

export function viewerCostAllowanceCents(settings: ViewerLabSettings) {
  return Math.round(settings.estimatedCostPerLearnerCents * (1 + settings.toleranceBps / 10_000));
}

export function recommendedViewerCapacity(settings: ViewerLabSettings, activeEnrolments: number) {
  const demand = Math.ceil(activeEnrolments * (settings.expectedConcurrencyBps / 10_000)) + settings.capacityBuffer;
  return Math.min(settings.maximumCapacity, Math.max(settings.minimumReadyCapacity, demand));
}
