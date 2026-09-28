export const APGI_BRAND = {
  brandName: "APGI Training",
  primaryColor: "#0D2850",
  secondaryColor: "#006B92",
  accentColor: "#4C95B0",
  paleColor: "#CCE1E9",
  footerText: "",
} as const;

export type CourseBranding = {
  courseId: string;
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  paleColor: string;
  footerText: string;
  isActive: boolean;
};

export type BrandingPreset = Omit<CourseBranding, "courseId" | "isActive"> & {
  id: string;
};

const COURSE_ROUTE_PATTERNS = [
  /^\/learn\/([^/]+)/,
  /^\/courses\/([^/]+)/,
  /^\/admin\/courses\/([^/]+)/,
];

export function courseSlugFromPathname(pathname: string): string | null {
  for (const pattern of COURSE_ROUTE_PATTERNS) {
    const match = pathname.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function isBrandColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}
