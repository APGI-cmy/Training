import Link from "next/link";
import { SignOutControl } from "@/components/auth/sign-out-control";
import { FileUploadControl } from "@/components/files/file-upload-control";
import { ProfileForm } from "@/components/profile/profile-form";
import { requireSession } from "@/server/auth/session";
import { getProfile, listProfileFiles } from "@/server/services/profiles";

export const dynamic = "force-dynamic";

function safeNext(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : undefined;
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ onboarding?: string; next?: string }> }) {
  const { onboarding, next } = await searchParams;
  const continueTo = onboarding === "invitation" ? safeNext(next) : undefined;
  const session = await requireSession();
  const [profile, files] = await Promise.all([getProfile(session), listProfileFiles(session)]);

  return (
    <main>
      <section className="page-masthead">
        <div className="content-inner">
          <p className="eyebrow">{continueTo ? "Course enrolment confirmed" : "W1 learner profile"}</p>
          <h1>{continueTo ? "Complete your learner profile" : "Profile and private files"}</h1>
          <p>{continueTo ? "Your course place is confirmed. Save your certificate details below, then continue to your course." : "Maintain certificate-critical learner details and private profile files."}</p>
          <nav className="button-row" aria-label="Learner navigation actions">
            <Link className="primary-button" href="/dashboard">Open learner dashboard</Link>
            {!continueTo ? <Link className="secondary-button" href="/learn/vpshr-level-0">Open gated Level 0 course</Link> : null}
            <SignOutControl />
          </nav>
        </div>
      </section>
      <section className="content-band">
        <div className="content-inner profile-grid">
          <section className="profile-panel">
            <h2>Profile</h2>
            <ProfileForm profile={profile} continueTo={continueTo} />
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
