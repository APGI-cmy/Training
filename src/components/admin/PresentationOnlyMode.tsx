"use client";

import { useEffect, type ReactNode } from "react";

export function PresentationOnlyMode({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.body.classList.add("presentation-only-mode");
    return () => document.body.classList.remove("presentation-only-mode");
  }, []);

  return <main className="admin-presentation-only" data-mode="presentation-only">{children}</main>;
}
