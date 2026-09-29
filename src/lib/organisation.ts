export type Organisation = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  paleColor: string;
  footerText: string;
  defaultReferralShareBps: number;
  isActive: boolean;
};

export type CourseCatalogueVisibility = "public" | "client_specific";

export function formatShareBps(value: number) {
  return `${(value / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}
