"use client";
import { useState, useTransition } from "react";
import { recordCertificatePrint } from "@/server/actions/course-benefits";

export function CertificatePrintButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return <div className="certificate-controls"><button className="primary-button" disabled={pending} onClick={() => start(async () => {
    setError("");
    try {
      const result = await recordCertificatePrint(id);
      if (result.error) setError(result.error); else window.print();
    } catch { setError("Your print request could not be recorded. Please try again."); }
  })}>{pending ? "Recording request…" : "Print / save certificate as PDF"}</button>
    <p>Choose your printer or “Save as PDF” in the print dialog. This records a print request; it cannot confirm that a physical copy was printed.</p>
    {error ? <p role="alert">{error}</p> : null}
  </div>;
}
