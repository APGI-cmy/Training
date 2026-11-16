"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="content-band">
      <div className="content-inner">
        <ErrorState reset={reset} />
      </div>
    </main>
  );
}
