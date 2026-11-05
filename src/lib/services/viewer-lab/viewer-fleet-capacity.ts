import type { Fleet } from "@aws-sdk/client-appstream";

export function viewerFleetCapacity(fleet: Pick<Fleet, "State" | "ComputeCapacityStatus" | "MaxSessionsPerInstance" | "FleetErrors">, target: number) {
  const c = fleet.ComputeCapacityStatus;
  const multi = (fleet.MaxSessionsPerInstance ?? 1) > 1;
  const desired = multi ? c?.DesiredUserSessions : c?.Desired;
  const available = multi ? c?.AvailableUserSessions : c?.Available;
  const inUse = multi ? c?.ActiveUserSessions : c?.InUse;
  const actual = multi ? c?.ActualUserSessions : c?.Running;
  const prepared = available === undefined || inUse === undefined ? null : available + inUse;
  return {
    state: fleet.State ?? "UNKNOWN", target, desired: desired ?? null,
    available: available ?? null, inUse: inUse ?? null, actual: actual ?? null, prepared,
    ready: fleet.State === "RUNNING" && prepared !== null && prepared >= target && !(fleet.FleetErrors?.length),
    multiSession: multi
  };
}
