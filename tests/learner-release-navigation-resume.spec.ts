import { describe, expect, it, vi } from "vitest";
import { createScormSaveQueue } from "../src/lib/scorm-save-queue";
import { viewerReturnPath } from "../src/lib/services/viewer-lab/viewer-return-path";
import { courseResumeFromRows } from "../src/lib/services/progress/get-course-resume";
import { ViewerUnitAccess } from "../src/components/course/ViewerUnitAccess";

describe("Independent training navigation and saved activity resume", () => {
  it.each(["lu1", "lu2", "lu3", "lu4", "lu5", "lu6", "lu7", "lu8", "lu9"])("never requires ending Viewer before rendering %s", async (unitSlug) => {
    expect(await ViewerUnitAccess({ userId: "learner", courseSlug: "scannex-training-programme", unitSlug, children: "enrolment-authorised content" })).toBe("enrolment-authorised content");
  });
  it("finds the most recently saved activity rather than the first incomplete unit", () => {
    const result = courseResumeFromRows("scannex-training-programme", [
      { unit_id: "scannex-lu-1", updated_at: "2026-11-10T09:00:00Z", suspend_data: "earlier", progress_measure: 0.5 },
      { unit_id: "scannex-lu-2", updated_at: "2026-11-10T10:00:00Z", suspend_data: "later", progress_measure: 0.25 },
      { unit_id: "scannex-lu-6", updated_at: "2026-11-10T11:00:00Z", suspend_data: "", location: "" }
    ]);
    expect(result?.href).toBe("/learn/scannex-training-programme/units/lu2/scorm");
    expect(result?.units).toEqual({ "scannex-lu-2": 25, "scannex-lu-1": 50 });
  });
  it("does not invent a saved location from an invalid or unknown unit", () => {
    expect(courseResumeFromRows("scannex-training-programme", [null, { unit_id: "other", updated_at: "2026-11-10T10:00:00Z", suspend_data: "x" }])).toBeNull();
  });
  it("returns from LU6 Viewer to the originating LU2 activity", () => {
    const href = "/learn/scannex-training-programme/units/lu2/scorm";
    expect(viewerReturnPath("scannex-training-programme", href)).toBe(href);
  });
  it.each(["https://evil.invalid", "//evil.invalid", "/admin", "/learn/other/units/lu2", "/learn/scannex-training-programme/units/lu2/../../admin", "/learn/scannex-training-programme/units/lu2\\evil"])("rejects an unsafe return destination %s", (value) => {
    expect(viewerReturnPath("scannex-training-programme", value)).toBeNull();
  });
  it("keeps snapshots ordered while a previous save is still running", async () => {
    let finish!: (ok: boolean) => void;
    const persist = vi.fn().mockImplementationOnce(() => new Promise<boolean>((resolve) => { finish = resolve; })).mockResolvedValue(true);
    const save = createScormSaveQueue(persist);
    const first = save("slide-2");
    await Promise.resolve(); await Promise.resolve();
    const second = save("slide-3");
    expect(persist).toHaveBeenCalledTimes(1);
    finish(true);
    await Promise.all([first, second]);
    expect(persist.mock.calls.map((call) => call[0])).toEqual(["slide-2", "slide-3"]);
  });
  it("retries a failed snapshot and does not repeatedly save unchanged state", async () => {
    const persist = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    const save = createScormSaveQueue(persist, "loaded-slide-2");
    expect(await save("loaded-slide-2")).toBe(true);
    expect(persist).not.toHaveBeenCalled();
    expect(await save("slide-3")).toBe(false);
    expect(await save("slide-3")).toBe(true);
    expect(await save("slide-3")).toBe(true);
    expect(persist).toHaveBeenCalledTimes(2);
  });
});
