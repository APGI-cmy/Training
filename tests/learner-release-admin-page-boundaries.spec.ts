import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ auth: vi.fn(), read: vi.fn(), component: vi.fn() }));
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: m.auth }));
vi.mock("@/server/supabase/admin-rest", () => ({ adminRest: m.read }));
vi.mock("@/lib/courses", () => ({ getCourses: m.read, getCourseBySlug: m.read }));
vi.mock("@/server/services/groups", () => ({ getGroups: m.read }));
vi.mock("@/server/services/organisations/get-organisations", () => ({ getActiveOrganisations: m.read, getOrganisationsForAdmin: m.read }));
vi.mock("@/server/services/branding/course-branding", () => ({ getBrandingPresets: m.read, getCourseBrandingForAdmin: m.read }));
vi.mock("@/lib/services/admin/get-admin-learners", () => ({ getAdminLearners: m.read, getAdminLearner: m.read }));
vi.mock("@/server/services/assessments/get-assessment-bookings", () => ({ getAssessmentBookings: m.read }));
vi.mock("@/server/auth/session", () => ({ getSupabaseRestUrl: m.read }));
vi.mock("@/server/actions/groups", () => ({ createGroup: m.component, assignLearnerGroup: m.component }));
vi.mock("@/server/actions/certificates", () => ({ saveCertificateDesign: m.component, revokeCertificate: m.component }));
vi.mock("@/components/admin/InvitationDeliveryControl", () => ({ InvitationDeliveryControl: m.component }));
vi.mock("@/components/admin/InvitationForm", () => ({ InvitationForm: m.component }));
vi.mock("@/components/admin/LearnerImportWorkspace", () => ({ LearnerImportWorkspace: m.component }));
vi.mock("@/components/admin/BrandingForm", () => ({ BrandingForm: m.component }));
vi.mock("@/components/admin/OrganisationWorkspace", () => ({ OrganisationWorkspace: m.component }));
vi.mock("@/components/admin/EnrolmentManagementWorkspace", () => ({ EnrolmentManagementWorkspace: m.component }));
vi.mock("@/components/admin/ScannexAssessmentWorkspace", () => ({ ScannexAssessmentWorkspace: m.component }));
vi.mock("@/components/certificates/CertificatePreview", () => ({ CertificatePreview: m.component }));
vi.mock("@/components/course/CourseCardCover", () => ({ CourseCardCover: m.component }));

import Invitations from "../app/(admin)/admin/invitations/page";
import Certificates from "../app/(admin)/admin/certificates/page";
import Organisations from "../app/(admin)/admin/organisations/page";
import Learners from "../app/(admin)/admin/learners/page";
import Branding from "../app/(admin)/admin/branding/page";
import Enrolments from "../app/(admin)/admin/enrolments/page";
import Assessments from "../app/(admin)/admin/assessments/page";
import Courses from "../app/admin/courses/page";

const pages = { Invitations, Certificates, Organisations, Learners, Branding, Enrolments, Assessments, Courses };
beforeEach(() => vi.resetAllMocks());
describe.each(["SIGNED_OUT", "LEARNER_NOT_ADMIN"])("Admin page boundary: %s", denial => {
  it.each(Object.entries(pages))("%s rejects before any data read or component render", async (_name, page) => {
    const redirect = new Error(denial);
    m.auth.mockRejectedValue(redirect);
    await expect(page({ searchParams: Promise.resolve({}) })).rejects.toBe(redirect);
    expect(m.auth).toHaveBeenCalledOnce();
    expect(m.read).not.toHaveBeenCalled();
    expect(m.component).not.toHaveBeenCalled();
  });
});
