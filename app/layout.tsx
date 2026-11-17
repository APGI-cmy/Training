import {requestTenantBrand} from '@/server/services/tenant-branding';
import {SecurityAssuranceNotice} from "@/components/security-watchdog/SecurityAssuranceNotice";
import {SessionActivity} from "@/components/auth/SessionActivity";
import {Suspense} from "react";
import {NotificationTargetMarkers} from "@/components/notifications/NotificationTargetMarkers";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BrandingShell } from "@/components/branding/BrandingShell";
import "./globals.css";
import { stagingEmailEnabled } from "@/server/environment-isolation";

const defaultMetadata: Metadata = {
  title: {
    default: "APGI Training",
    template: "%s | APGI Training"
  },
  description: "Version 2 test environment for the APGI training platform.",
  robots: { index: false, follow: false }
};

export async function generateMetadata():Promise<Metadata>{const b=await requestTenantBrand();return b?{...defaultMetadata,title:{default:`${b.brandName} Training`,template:`%s | ${b.brandName}`},description:`${b.brandName} learning portal`}:defaultMetadata;}

export default async function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const tenantBrand=await requestTenantBrand();
  return (
    <html lang="en">
      <body>
        <SessionActivity/><SecurityAssuranceNotice/>
        <Suspense fallback={null}><NotificationTargetMarkers/></Suspense>
        {process.env.ALP_ENVIRONMENT!=="training-production"?<div role="note" style={{ background: "#ffe8a3", color: "#172b46", padding: "12px 20px", textAlign: "center", fontWeight: 700 }}>
          Version 2 test environment — separate accounts and test data. {stagingEmailEnabled() ? "Invitation and account emails are enabled. Payments and Viewer streaming are disabled." : "Email, payments and Viewer streaming are disabled."}
        </div>:null}
        {/* The course-aware header keeps Brand href="/" as the role-neutral home destination. */}
        <BrandingShell homeHref="/" initialBranding={tenantBrand}>{children}</BrandingShell>
      </body>
    </html>
  );
}
