import { describe, expect, it } from "vitest";
import { expectContains, expectPath, read } from "./helpers/project-root";

describe("ALP W4.1 navigation sidebar and loop-breaker", () => {
  it("QA-ALP-248 persistent learner sidebar exposes proof-critical routes", () => {
    expectPath("src/components/navigation/LearnerSidebar.tsx", "QA-ALP-248");
    expectContains("src/components/navigation/LearnerSidebar.tsx", "Learner navigation", "QA-ALP-248");
    expectContains("src/components/navigation/LearnerSidebar.tsx", 'href="/dashboard"', "QA-ALP-248");
    expectContains("src/components/navigation/LearnerSidebar.tsx", 'href="/profile"', "QA-ALP-248");
    expectContains("src/components/navigation/LearnerSidebar.tsx", 'href="/courses/vpshr-level-0"', "QA-ALP-248");
    expectContains("src/components/navigation/LearnerSidebar.tsx", 'href="/learn/vpshr-level-0"', "QA-ALP-248");
    expectContains(
      "src/components/navigation/LearnerSidebar.tsx",
      'href="/learn/vpshr-level-0/units/introduction"',
      "QA-ALP-248"
    );
    expectContains("src/components/navigation/LearnerSidebar.tsx", "SignOutControl", "QA-ALP-248");
  });

  it("QA-ALP-249 root layout renders a session-aware learner shell", () => {
    expectContains("app/layout.tsx", "getCurrentSession", "QA-ALP-249");
    expectContains("app/layout.tsx", "LearnerSidebar", "QA-ALP-249");
    expectContains("app/layout.tsx", "learner-shell", "QA-ALP-249");
    expectContains("app/layout.tsx", 'import "./navigation-shell.css"', "QA-ALP-249");
  });

  it("QA-ALP-250 denied state exposes loop-breaker navigation", () => {
    expectContains("src/components/course/CourseAccessDenied.tsx", "/courses/vpshr-level-0", "QA-ALP-250");
    expectContains("src/components/course/CourseAccessDenied.tsx", "Open public course landing", "QA-ALP-250");
    expectContains("src/components/course/CourseAccessDenied.tsx", "SignOutControl", "QA-ALP-250");
  });

  it("QA-ALP-251 sidebar replaces footer-only navigation and is responsive", () => {
    const layout = read("app/layout.tsx");
    expect(layout.includes("app-footer"), "QA-ALP-251: footer-only navigation must be removed").toBe(false);
    expectPath("app/navigation-shell.css", "QA-ALP-251");
    expectContains("app/navigation-shell.css", ".learner-sidebar", "QA-ALP-251");
    expectContains("app/navigation-shell.css", ".learner-shell", "QA-ALP-251");
    expectContains("app/navigation-shell.css", "@media (max-width: 860px)", "QA-ALP-251");
  });
});
