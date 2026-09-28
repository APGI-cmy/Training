"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { courseSlugFromPathname, type CourseBranding } from "@/lib/branding";

const CourseBrandingContext = createContext<CourseBranding | null>(null);

export function useCourseBranding() {
  return useContext(CourseBrandingContext);
}

export function BrandingShell({ children, homeHref = "/" }: { children: ReactNode; homeHref?: string }) {
  const pathname = usePathname();
  const courseSlug = courseSlugFromPathname(pathname);
  const [branding, setBranding] = useState<CourseBranding | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!courseSlug) {
      setBranding(null);
      return;
    }

    void fetch(`/api/branding?courseSlug=${encodeURIComponent(courseSlug)}`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : { branding: null })
      .then((payload: { branding?: CourseBranding | null }) => {
        if (!cancelled) setBranding(payload.branding ?? null);
      })
      .catch(() => {
        if (!cancelled) setBranding(null);
      });
    return () => { cancelled = true; };
  }, [courseSlug]);

  useEffect(() => {
    const root = document.documentElement;
    const values = branding
      ? {
          "--brand-navy": branding.primaryColor,
          "--brand-blue": branding.secondaryColor,
          "--brand-mid-blue": branding.accentColor,
          "--brand-pale-blue": branding.paleColor,
        }
      : {
          "--brand-navy": "#0D2850",
          "--brand-blue": "#006B92",
          "--brand-mid-blue": "#4C95B0",
          "--brand-pale-blue": "#CCE1E9",
        };
    for (const [property, value] of Object.entries(values)) root.style.setProperty(property, value);
  }, [branding]);

  return (
    <CourseBrandingContext.Provider value={branding}>
      <header className="app-header">
        <Brand href={homeHref} branding={branding} />
        <ThemeToggle />
      </header>
      {children}
      {branding ? <footer className="app-footer powered-by-footer">{branding.footerText}</footer> : null}
    </CourseBrandingContext.Provider>
  );
}
