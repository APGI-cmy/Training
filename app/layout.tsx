import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BrandingShell } from "@/components/branding/BrandingShell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "APGI Training",
    template: "%s | APGI Training"
  },
  description: "Responsive VPSHR learning units for the APGI training platform."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {/* The course-aware header keeps Brand href="/" as the role-neutral home destination. */}
        <BrandingShell homeHref="/">{children}</BrandingShell>
      </body>
    </html>
  );
}
