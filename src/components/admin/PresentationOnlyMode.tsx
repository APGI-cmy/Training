"use client";

import { useEffect, type ReactNode } from "react";

export function PresentationOnlyMode({
  children,
  eBookHref
}: {
  children: ReactNode;
  eBookHref?: string;
}) {
  useEffect(() => {
    document.body.classList.add("presentation-only-mode");
    return () => document.body.classList.remove("presentation-only-mode");
  }, []);

  return (
    <main className="admin-presentation-only" data-mode="presentation-only">
      {eBookHref && <a className="presentation-resource-link" href={eBookHref} target="_blank" rel="noreferrer">Open e-book</a>}
      {children}
    </main>
  );
}
