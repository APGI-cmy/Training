import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Administration</p>
        <h1>Learning administration</h1>
        <nav aria-label="Administration navigation">
          <Link href="/admin">Overview</Link>{" "}
          <Link href="/admin/invitations">Invitations</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
