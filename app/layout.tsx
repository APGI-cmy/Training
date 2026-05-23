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
          <nav aria-label="Primary navigation">
            <Link href="/courses">Courses</Link>
            <ThemeToggle />
          </nav>
        </header>
        {children}
        <footer className="app-footer">
          <span>VPSHR learning platform</span>
          <Link href="/courses/vpshr-level-0">Level 0</Link>
        </footer>
      </body>
    </html>
  );
}
