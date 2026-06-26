import { FileUploadControl } from "@/components/files/file-upload-control";
import { ProfileForm } from "@/components/profile/profile-form";
import { requireSession } from "@/server/auth/session";
import { getProfile, listProfileFiles } from "@/server/services/profiles";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireSession();
  const [profile, files] = await Promise.all([getProfile(session), listProfileFiles(session)]);

  return (
    <main>
      <section className="page-masthead">
        <div className="content-inner">
          <p className="eyebrow">W1 learner profile</p>
          <h1>Profile and private files</h1>
          <p>Maintain certificate-critical learner details and private profile files.</p>
        </div>
      </section>
      <section className="content-band">
        <div className="content-inner profile-grid">
          <section className="profile-panel">
            <h2>Profile</h2>
            <ProfileForm profile={profile} />
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
