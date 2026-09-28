"use client";

import { useCourseBranding } from "@/components/branding/BrandingShell";

export function BrandingName() {
  const branding = useCourseBranding();
  return <>{branding?.brandName ?? "APGI Training"}</>;
}
