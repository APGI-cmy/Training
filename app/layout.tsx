import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
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
        <header className="app-header">
          <Link className="brand-link" href="/courses/vpshr-level-0">
            APGI Training
          </Link>
          <ThemeToggle />
        </header>
        {children}
      </body>
    </html>
  );
}
