import { describe, expect, it } from "vitest";
import { read } from "./helpers/project-root";

const migration = read("supabase/migrations/010_alp_admin_invitations.sql");
const accessService = read("src/lib/services/enrolments/get-course-access.ts");

describe("ALP W4.2 invitation migration security correction", () => {
  it("keeps invitation tables inaccessible to anonymous and ordinary authenticated API clients", () => {
    expect(migration).toContain("revoke all privileges on table public.course_invitations from public, anon, authenticated");
    expect(migration).toContain("revoke all privileges on table public.course_invitation_events from public, anon, authenticated");
    expect(migration).toContain("grant all privileges on table public.course_invitations to service_role");
    expect(migration).toContain("grant all privileges on table public.course_invitation_events to service_role");
  });

  it("does not expose invitation secrets through a recipient table-select policy", () => {
    expect(migration).not.toContain("course_invitations_recipient_select");
    expect(migration).not.toContain("for select\nusing (lower(recipient_email)");
  });

  it("uses a bounded authenticated boolean RPC for pending invitation detection", () => {
    expect(migration).toContain("create or replace function public.alp_has_pending_invitation");
    expect(migration).toContain("returns boolean");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("revoke all privileges on function public.alp_has_pending_invitation(text) from public, anon");
    expect(migration).toContain("grant execute on function public.alp_has_pending_invitation(text) to authenticated");
    expect(accessService).toContain("/rest/v1/rpc/alp_has_pending_invitation");
    expect(accessService).toContain("JSON.stringify({ p_course_id: courseId })");
    expect(accessService).not.toContain("/rest/v1/course_invitations?select=id");
  });

  it("preserves invitation audit history against implicit parent deletion", () => {
    expect(migration).toContain("references public.course_invitations(id) on delete restrict");
    expect(migration).not.toContain("references public.course_invitations(id) on delete cascade");
  });

  it("does not create direct admin ALL policies over invitation or event records", () => {
    expect(migration).not.toContain("course_invitations_admin_all");
    expect(migration).not.toContain("course_invitation_events_admin_all");
  });

  it("hardens the shared updated-at function search path", () => {
    expect(migration).toContain("alter function public.set_updated_at() set search_path = ''");
  });
});
