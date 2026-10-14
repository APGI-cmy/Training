import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BrandingShell } from "@/components/branding/BrandingShell";
import "./globals.css";

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
        <div role="note" style={{ background: "#ffe8a3", color: "#172b46", padding: "12px 20px", textAlign: "center", fontWeight: 700 }}>
          Version 2 test environment — test accounts only. Email, payments and Viewer streaming are disabled.
        </div>
        {/* The course-aware header keeps Brand href="/" as the role-neutral home destination. */}
        <BrandingShell homeHref="/">{children}</BrandingShell>
      </body>
    </html>
  );
}
