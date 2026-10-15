"use client";

import {
  useCourseBranding,
  useBrandingReady,
} from "@/components/branding/BrandingShell";

export function BrandingName() {
  const branding = useCourseBranding();
  const ready = useBrandingReady();
  if (!ready) return <>Training</>;
  return <>{branding ? `${branding.brandName} Training` : "APGI Training"}</>;
}
