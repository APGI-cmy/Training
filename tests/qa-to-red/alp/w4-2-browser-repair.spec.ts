import { describe, expect, it } from "vitest";
import { getPostSignInDestination } from "../../../src/lib/auth/post-sign-in-destination";
import { encodeAssetPath } from "../../../src/lib/courses";

describe("ALP W4.2 Batch 3 browser repair", () => {
  it("routes administrators to the administration landing after sign-in", () => {
    expect(getPostSignInDestination(["admin"])).toBe("/admin");
    expect(getPostSignInDestination(["learner", "admin"])).toBe("/admin");
  });

  it("routes signed-in non-administrators to the learner dashboard", () => {
    expect(getPostSignInDestination([])).toBe("/dashboard");
    expect(getPostSignInDestination(["learner"])).toBe("/dashboard");
    expect(getPostSignInDestination(["reviewer"])).toBe("/dashboard");
  });

  it("encodes raw asset paths exactly once", () => {
    expect(encodeAssetPath("/courses/Scannex Training Programme/LU 1 - Introduction & The Case for Scannex/index.html"))
      .toBe("/courses/Scannex%20Training%20Programme/LU%201%20-%20Introduction%20%26%20The%20Case%20for%20Scannex/index.html");
  });

  it("does not double-encode already encoded Scannex asset paths", () => {
    const encoded = "/courses/Scannex%20Training%20Programme/LU%201%20-%20Introduction%20%26%20The%20Case%20for%20Scannex/index.html";
    const result = encodeAssetPath(encoded);

    expect(result).toBe(encoded);
    expect(result).not.toContain("%2520");
    expect(result).not.toContain("%2526");
  });
});
