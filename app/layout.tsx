import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutControl } from "@/components/auth/sign-out-control";
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
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/profile">Profile</Link>
            <Link href="/courses">Courses</Link>
            <SignOutControl />
            <ThemeToggle />
          </nav>
        </header>
        {children}
        <footer className="app-footer">
          <span>VPSHR learning platform</span>
          <Link className="secondary-button" href="/dashboard">
            Open dashboard
          </Link>
          <Link href="/learn/vpshr-level-0">Gated Level 0</Link>
          <Link href="/courses/vpshr-level-0">Public Level 0 landing</Link>
        </footer>
      </body>
    </html>
  );
}
