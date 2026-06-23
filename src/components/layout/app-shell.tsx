import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
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
    </>
  );
}
