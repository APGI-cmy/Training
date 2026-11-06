"use client";

import { useEffect, type ReactNode } from "react";
import { ActivityToolbar } from "@/components/course/ActivityToolbar";

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
      <ActivityToolbar
        returnHref={returnHref}
        resourceHref={eBookHref}
        status="Administrator preview — learner progress is not recorded."
        onReload={() => window.location.reload()}
      />
      {children}
    </main>
  );
}
