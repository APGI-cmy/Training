"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { courseSlugFromPathname, type CourseBranding } from "@/lib/branding";
import { getCourses } from "@/lib/courses";

const CourseBrandingContext = createContext<CourseBranding | null>(null);

export function useCourseBranding() {
  return useContext(CourseBrandingContext);
}

export function BrandingShell({ children, homeHref = "/" }: { children: ReactNode; homeHref?: string }) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const courseSlug = courseSlugFromPathname(pathname)
    ?? (pathname === "/admin/branding" ? new URLSearchParams(search).get("course") ?? getCourses()[0]?.slug ?? null : null);
  const [branding, setBranding] = useState<CourseBranding | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refreshBranding = () => {
      setSearch(window.location.search);
      setRevision((current) => current + 1);
    };
    window.addEventListener("alp-branding-updated", refreshBranding);
    window.addEventListener("popstate", refreshBranding);
    refreshBranding();
    return () => {
      window.removeEventListener("alp-branding-updated", refreshBranding);
      window.removeEventListener("popstate", refreshBranding);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const query = courseSlug ? `?courseSlug=${encodeURIComponent(courseSlug)}` : "";
    void fetch(`/api/branding${query}`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : { branding: null })
      .then((payload: { branding?: CourseBranding | null }) => {
        if (!cancelled) setBranding(payload.branding ?? null);
      })
      .catch(() => {
        if (!cancelled) setBranding(null);
      });
    return () => { cancelled = true; };
  }, [courseSlug, revision]);

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
