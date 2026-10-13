import Link from "next/link";
import { SignOutControl } from "@/components/auth/sign-out-control";
import { FileUploadControl } from "@/components/files/file-upload-control";
import { ProfileForm } from "@/components/profile/profile-form";
import { requireSession, getUserRoles } from "@/server/auth/session";
import { getProfile, listProfileFiles } from "@/server/services/profiles";
import { isLearnerProfileComplete, isStaffAccount } from "@/lib/auth/learner-profile-completion";
import { getPendingCourseInvitations } from "@/server/services/invitations/pending-for-learner";
import { getCourseBySlug } from "@/lib/courses";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ onboarding?: string; next?: string }> }) {
  const { onboarding } = await searchParams;
  const session = await requireSession();
  const [profile, files, roles, pendingInvitations] = await Promise.all([
    getProfile(session), listProfileFiles(session), getUserRoles(session.accessToken),
    getPendingCourseInvitations(session).catch(() => [])
  ]);
  const completingOnboarding = onboarding === "invitation" || onboarding === "required"
    || (!isStaffAccount(roles) && !isLearnerProfileComplete(profile));

  return (
    <main>
      <section className="page-masthead">
        <div className="content-inner">
          <p className="eyebrow">{completingOnboarding ? "Welcome to APGI Training" : "Learner profile"}</p>
          <h1>{completingOnboarding ? "Complete your learner profile" : "Profile and private files"}</h1>
          <p>{completingOnboarding ? "Complete and save your details first. You will then go to your dashboard, where your enrolled courses are ready to open." : "Maintain your learner and certificate details and private profile files."}</p>
          <p>Account email: <strong>{session.user.email}</strong></p>
          <nav className="button-row" aria-label="Learner navigation actions">
            {!completingOnboarding ? <Link className="primary-button" href="/dashboard">Open learner dashboard</Link> : null}
            <SignOutControl />
          </nav>
        </div>
      </section>
      <section className="content-band">
        <div className="content-inner profile-grid">
          <section className="profile-panel">
            <h2>Profile</h2>
            {completingOnboarding && pendingInvitations.length > 0 ? <div className="state-card">
              <p><strong>Your course invitations</strong></p>
              <ul>{pendingInvitations.map(invitation => <li key={invitation.id}>{getCourseBySlug(invitation.course_id)?.title ?? "APGI course"}</li>)}</ul>
              <p>Saving your profile will also accept these valid invitations issued to your account email.</p>
            </div> : null}
            <ProfileForm profile={profile} onboarding={completingOnboarding} />
          </section>
          <section className="profile-panel">
            <h2>Private files</h2>
            <FileUploadControl />
            <ul className="plain-list file-list">
              {files.map((file) => (
                <li key={file.id}>
                  <strong>{file.original_filename}</strong>
                  <span>{file.file_purpose}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}
