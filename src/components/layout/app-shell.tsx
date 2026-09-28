import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Brand } from "@/components/Brand";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <header className="app-header">
        <Brand href="/courses/vpshr-level-0" />
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
