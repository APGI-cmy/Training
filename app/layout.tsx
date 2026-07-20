import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { LearnerSidebar } from "@/components/navigation/LearnerSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentSession } from "@/server/auth/session";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "APGI Training",
    template: "%s | APGI Training"
  },
  description: "Responsive VPSHR learning units for the APGI training platform."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await getCurrentSession();

  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <Link className="brand-link" href={session ? "/dashboard" : "/courses/vpshr-level-0"}>
            APGI Training
          </Link>
          <ThemeToggle />
        </header>

        {session ? (
          <div className="learner-shell">
            <LearnerSidebar />
            <div className="learner-content">{children}</div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
