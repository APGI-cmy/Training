"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";

export function PresentationOnlyMode({
  children,
  eBookHref,
  returnHref
}: {
  children: ReactNode;
  eBookHref?: string;
  returnHref: string;
}) {
  useEffect(() => {
    document.body.classList.add("presentation-only-mode");
    return () => document.body.classList.remove("presentation-only-mode");
  }, []);

  return (
    <main className="admin-presentation-only" data-mode="presentation-only">
      <nav className="activity-toolbar" aria-label="Preview navigation">
        <Link className="secondary-button" href={returnHref}>← Back to unit preview</Link>
        <p className="activity-save-status">Administrator preview</p>
        {eBookHref ? <a className="primary-button" href={eBookHref} target="_blank" rel="noreferrer">Open e-book</a> : null}
      </nav>
      {children}
    </main>
  );
}
