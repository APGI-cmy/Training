"use client";

import { useEffect, useState } from "react";
import type { ViewerLabAvailability } from "@/lib/services/viewer-lab/viewer-lab-settings";

export function ViewerLabNotice({
  courseSlug,
  unitSlug,
  availability
}: {
  courseSlug: string;
  unitSlug: string;
  availability: ViewerLabAvailability;
}) {
  const [message, setMessage] = useState(availability.message);
  const [tone, setTone] = useState<"info" | "success" | "warning">(availability.canLaunch ? "info" : "warning");
  const [visible, setVisible] = useState(availability.appliesToUnit);

  useEffect(() => {
    if (!availability.canLaunch) return;
    const controller = new AbortController();
    fetch(`/learn/${encodeURIComponent(courseSlug)}/units/${encodeURIComponent(unitSlug)}/viewer-lab/warmup`, {
      method: "POST",
      signal: controller.signal
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as { status?: string; message?: string };
        if (!controller.signal.aborted && payload.message) {
          setMessage(payload.message);
          setTone(payload.status === "ready" ? "success" : payload.status === "starting" ? "info" : "warning");
          setVisible(true);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setMessage("The Viewer preparation status could not be checked. You can continue with the learning material and try the Viewer Lab later.");
          setTone("warning");
          setVisible(true);
        }
      });
    return () => controller.abort();
  }, [availability.canLaunch, availability.message, courseSlug, unitSlug]);

  if (!visible) return null;
  return (
    <aside className={`app-toast app-toast--${tone}`} role={tone === "warning" ? "alert" : "status"} aria-live="polite">
      <div><strong>Scannex Viewer</strong><p>{message}</p></div>
      <button type="button" aria-label="Dismiss Viewer notification" onClick={() => setVisible(false)}>×</button>
    </aside>
  );
}
