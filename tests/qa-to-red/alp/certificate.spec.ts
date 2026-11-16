import { describe, it } from "vitest";
import { expectContains, expectPath } from "./helpers/project-root";

describe("ALP Stage 6 certificates", () => {
  it("QA-ALP-416 certificate routes exist", () => {
    expectPath("app/(learner)/certificates/page.tsx", "QA-ALP-416");
    expectPath("app/(learner)/certificates/[certificateId]/page.tsx", "QA-ALP-416");
  });

  it("QA-ALP-421 certificate generation action and schema exist", () => {
    expectPath("src/server/actions/certificates/generate-certificate.ts", "QA-ALP-421");
    expectContains("supabase/migrations/006_alp_files_certificates_notifications_audit.sql", "certificates", "QA-ALP-421");
  });

  it("QA-ALP-424 certificate download action exists", () => {
    expectPath("src/server/actions/certificates/get-certificate-file.ts", "QA-ALP-424");
  });

  it("QA-ALP-429 certificate events are auditable", () => {
    expectContains("supabase/migrations/006_alp_files_certificates_notifications_audit.sql", "certificate_events", "QA-ALP-429");
  });
});
