import { describe, expect, it } from "vitest";
import { courseSlugFromPathname, isBrandColor } from "../../../src/lib/branding";

describe("course branding boundaries", () => {
  it("identifies course routes without applying a client identity to global navigation", () => {
    expect(courseSlugFromPathname("/learn/scannex-training-programme/units/lu1")).toBe("scannex-training-programme");
    expect(courseSlugFromPathname("/admin/courses/vpshr-level-0/preview")).toBe("vpshr-level-0");
    expect(courseSlugFromPathname("/dashboard")).toBeNull();
    expect(courseSlugFromPathname("/admin/branding")).toBeNull();
  });

  it("keeps course identities scoped to a course route or the selected branding workspace", () => {
    expect(courseSlugFromPathname("/admin/branding")).toBeNull();
    expect(courseSlugFromPathname("/admin/courses/scannex-training-programme/preview")).toBe("scannex-training-programme");
  });

  it("accepts only complete hexadecimal colours for persisted client branding", () => {
    expect(isBrandColor("#006B92")).toBe(true);
    expect(isBrandColor("006B92")).toBe(false);
    expect(isBrandColor("#06B")).toBe(false);
    expect(isBrandColor("blue")).toBe(false);
  });
});
