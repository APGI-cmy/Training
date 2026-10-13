import type { AlpProfile } from "@/server/services/profiles";

export function isLearnerProfileComplete(profile: AlpProfile | null): boolean {
  return Boolean(profile?.certificate_name?.trim());
}

export function isStaffAccount(roles: readonly string[]): boolean {
  return roles.some(role => ["admin", "reviewer", "course_publisher"].includes(role));
}
