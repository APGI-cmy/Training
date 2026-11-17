"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {PlatformWatermark} from './PlatformWatermark';
import './watermarks.css';
import { Brand } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeToggle";
import { courseSlugFromPathname, type CourseBranding } from "@/lib/branding";
import { getCourses } from "@/lib/courses";
import { privacyNotice } from "@/lib/privacy-notice";

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
  initialBranding=null,
}: {
  children: ReactNode;
  homeHref?: string;
  initialBranding?:CourseBranding|null;
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
  const [branding, setBranding] = useState<CourseBranding | null>(initialBranding);
  const [revision, setRevision] = useState(0);
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);
  const companyId = pathname.match(/^\/company\/([0-9a-f-]{36})(?:\/|$)/i)?.[1];

  useEffect(() => {
    const refreshBranding = () => {
      setSearch(window.location.search);
      setRevision((current) => current + 1);
    };
    window.addEventListener("alp-branding-updated", refreshBranding);
    window.addEventListener("popstate", refreshBranding);
    window.addEventListener("focus", refreshBranding);
    const visible=()=>{if(document.visibilityState==='visible')refreshBranding();};
    document.addEventListener("visibilitychange",visible);
    refreshBranding();
    return () => {
      window.removeEventListener("alp-branding-updated", refreshBranding);
      window.removeEventListener("popstate", refreshBranding);
      window.removeEventListener("focus", refreshBranding);
      document.removeEventListener("visibilitychange",visible);
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
          setBranding(payload.branding ?? initialBranding);
          setResolvedPath(pathname);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBranding(initialBranding);
          setResolvedPath(initialBranding?pathname:null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [courseSlug, companyId, pathname, revision, initialBranding]);

  useEffect(() => {
    const root = document.documentElement;
    if(branding?.hidePlatformBranding)root.dataset.whiteLabel="true";else delete root.dataset.whiteLabel;
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
        value={resolvedPath === pathname ? branding : initialBranding}
      >
        <header className="app-header">
          {resolvedPath === pathname || initialBranding ? (
            <Brand href={homeHref} branding={resolvedPath === pathname ? branding : initialBranding} />
          ) : (
            <span role="status">Loading training workspace…</span>
          )}
          <ThemeToggle />
        </header>
        {resolvedPath===pathname&&branding?<PlatformWatermark value={branding.watermark} logoUrl={branding.logoUrl} imageUrl={branding.watermarkUrl}/>:null}
        {children}
        <footer className="app-footer powered-by-footer">
          {branding?.footerText ? <span>{branding.footerText} · </span> : null}
          <a href={privacyNotice.url} target="_blank" rel="noopener noreferrer">Privacy policy (opens a new tab)</a>
        </footer>
      </CourseBrandingContext.Provider>
    </BrandingReadyContext.Provider>
  );
}
