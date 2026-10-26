import {SessionActivity} from "@/components/auth/SessionActivity";
import {Suspense} from "react";
import {NotificationTargetMarkers} from "@/components/notifications/NotificationTargetMarkers";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BrandingShell } from "@/components/branding/BrandingShell";
import "./globals.css";
import { stagingEmailEnabled } from "@/server/environment-isolation";

export const metadata: Metadata = {
  title: {
    default: "APGI Training",
    template: "%s | APGI Training"
  },
  description: "Version 2 test environment for the APGI training platform.",
  robots: { index: false, follow: false }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SessionActivity/>
        <Suspense fallback={null}><NotificationTargetMarkers/></Suspense>
        <div role="note" style={{ background: "#ffe8a3", color: "#172b46", padding: "12px 20px", textAlign: "center", fontWeight: 700 }}>
          Version 2 test environment — separate accounts and test data. {stagingEmailEnabled() ? "Invitation and account emails are enabled. Payments and Viewer streaming are disabled." : "Email, payments and Viewer streaming are disabled."}
        </div>
        {/* The course-aware header keeps Brand href="/" as the role-neutral home destination. */}
        <BrandingShell homeHref="/">{children}</BrandingShell>
      </body>
    </html>
  );
}
