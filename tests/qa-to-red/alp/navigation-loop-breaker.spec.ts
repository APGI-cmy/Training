import { describe, expect, it } from "vitest";
import { expectContains, expectPath, read } from "./helpers/project-root";

describe("ALP W4.1 navigation sidebar and loop-breaker", () => {
  it("QA-ALP-248 persistent learner sidebar exposes proof-critical routes", () => {
    expectPath("src/components/navigation/LearnerSidebar.tsx", "QA-ALP-248");
    expectContains("src/components/navigation/LearnerSidebar.tsx", "Learner navigation", "QA-ALP-248");
    expectContains("src/components/navigation/LearnerSidebar.tsx", 'href="/dashboard"', "QA-ALP-248");
    expectContains("src/components/navigation/LearnerSidebar.tsx", 'href="/profile"', "QA-ALP-248");
    expectContains("src/components/navigation/LearnerSidebar.tsx", 'href="/courses