import { describe, it } from "vitest";
import { expectContains, expectPath } from "./helpers/project-root";

describe("ALP Stage 6 governance artifacts", () => {
  it("QA-ALP-001 app description exists", () => {
    expectPath("modules/ALP/00-app-description/app-description.md", "QA-ALP-001");
  });

  it("QA-ALP-002 UX workflow and wiring spec exists", () => {
    expectPath("modules/ALP/01-ux-workflow-wiring/ux-workflow-wiring-spec.md", "QA-ALP-002");
  });

  it("QA-ALP-003 FRS exists", () => {
    expectPath("modules/ALP/02-frs/functional-requirements.md", "QA-ALP-003");
  });

  it("QA-ALP-005 TRS exists", () => {
    expectPath("modules/ALP/03-trs/technical-requirements-specification.md", "QA-ALP-005");
  });

  it("QA-ALP-006 hardened architecture exists", () => {
    expectPath("modules/ALP/04-architecture/architecture.md", "QA-ALP-006");
    expectContains("modules/ALP/04-architecture/architecture.md", "Architecture v0.2", "QA-ALP-006");
  });

  it("QA-ALP-008 requirement registry exists", () => {
    expectPath("modules/ALP/REQUIREMENT_REGISTRY.md", "QA-ALP-008");
  });

  it("QA-ALP-009 QA-to-Red specification exists", () => {
    expectPath("modules/ALP/05-qa-to-red/qa-to-red.md", "QA-ALP-009");
  });

  it("QA-ALP-010 build remains blocked", () => {
    expectContains("modules/ALP/05-qa-to-red/qa-to-red.md", "Build Authorized? | No", "QA-ALP-010");
  });

  it("QA-ALP-015 QA catalog alignment exists", () => {
    expectPath("modules/ALP/05-qa-to-red/qa-catalog-alignment.md", "QA-ALP-015");
  });
});
