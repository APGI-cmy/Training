import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScannexPilotViewerHelp } from "@/components/assessment/ScannexPilotViewerHelp";

const renderHelp = () => renderToStaticMarkup(createElement(ScannexPilotViewerHelp, {
  dialogRef: createRef<HTMLDialogElement>(),
}));

describe("private Image 78 Viewer setup help", () => {
  it("renders a named, dismissible dialog without opening it on page render", () => {
    const html = renderHelp();
    const startTag = html.match(/<dialog\b[^>]*>/)?.[0];
    expect(startTag).toContain("aria-labelledby");
    expect(startTag).toContain("aria-describedby");
    expect(startTag).not.toMatch(/\sopen(?:=|\s|>)/);
    expect(html).toContain('method="dialog"');
    expect(html).toContain("Back to the worksheet");
  });

  it("orders readiness, Review sign-in and Image 78 verification before recording", () => {
    const html = renderHelp();
    expect(html).toContain("grey Review (R/W) button");
    expect(html).not.toContain("APGI-Scannex-Pilot-Launcher.exe");
    const ready = html.indexOf("Wait for the Viewer to get ready.");
    const review = html.indexOf("Sign in to Scannex Review.");
    const image = html.indexOf("Check for Image 78.");
    expect(ready).toBeGreaterThan(0);
    expect(review).toBeGreaterThan(ready);
    expect(image).toBeGreaterThan(review);
    expect(html).toContain("leave recording off until you see Image 78");
    expect(html).toContain("C:\\scannex\\Viewer Training Images\\F000000078.Tiff");
    expect(html).toContain("A manual load does not verify automatic loading.");
  });
});
