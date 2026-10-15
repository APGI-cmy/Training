"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { courseSlugFromPathname, type CourseBranding } from "@/lib/branding";
import { getCourses } from "@/lib/courses";

const CourseBrandingContext = createContext<CourseBranding | null>(null);
const BrandingReadyContext = createContext(false);
export function useBrandingReady() {
  return useContext(BrandingReadyContext);
}

export function useCourseBranding() {
  return useContext(CourseBrandingContext);
}

export function BrandingShell({
  children,
  homeHref = "/",
}: {
  children: ReactNode;
  homeHref?: string;
}) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const courseSlug =
    courseSlugFromPathname(pathname) ??
    (pathname === "/admin/branding"
      ? (new URLSearchParams(search).get("course") ??
        getCourses()[0]?.slug ??
        null)
      : null);
  const [branding, setBranding] = useState<CourseBranding | null>(null);
  const [revision, setRevision] = useState(0);
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);
  const companyId = pathname.match(/^\/company\/([0-9a-f-]{36})$/i)?.[1];

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
    const query = companyId
      ? `?organisationId=${companyId}`
      : pathname.startsWith("/admin")
        ? "?workspace=admin"
        : courseSlug
          ? `?courseSlug=${encodeURIComponent(courseSlug)}`
          : "";
    void fetch(`/api/branding${query}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Workspace branding unavailable");
        return response.json();
      })
      .then((payload: { branding?: CourseBranding | null }) => {
        if (!cancelled) {
          setBranding(payload.branding ?? null);
          setResolvedPath(pathname);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBranding(null);
          setResolvedPath(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [courseSlug, companyId, pathname, revision]);

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
    for (const [property, value] of Object.entries(values))
      root.style.setProperty(property, value);
  }, [branding]);

  return (
    <BrandingReadyContext.Provider value={resolvedPath === pathname}>
      <CourseBrandingContext.Provider
        value={resolvedPath === pathname ? branding : null}
      >
        <header className="app-header">
          {resolvedPath === pathname ? (
            <Brand href={homeHref} branding={branding} />
          ) : (
            <span role="status">Loading training workspace…</span>
          )}
          <ThemeToggle />
        </header>
        {children}
        {branding ? (
          <footer className="app-footer powered-by-footer">
            {branding.footerText}
          </footer>
        ) : null}
      </CourseBrandingContext.Provider>
    </BrandingReadyContext.Provider>
  );
}
