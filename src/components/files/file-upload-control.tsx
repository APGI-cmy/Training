"use client";

import { useActionState } from "react";
import {
  uploadProfileFileAction,
  type FileUploadState
} from "@/server/actions/files/upload-profile-file";

const initialState: FileUploadState = {};

export function FileUploadControl() {
  const [state, formAction, pending] = useActionState(uploadProfileFileAction, initialState);

  return (
    <form className="alp-form" action={formAction}>
      <label>
        File type
        <select name="file_purpose" defaultValue="cv">
          <option value="cv">CV / learner record</option>
          <option value="profile_photo">Profile photo</option>
        </select>
      </label>
      <label>
        Private file
        <input name="profile_file" type="file" required />
      </label>
      {state.error ? <p className="feedback feedback-review">{state.error}</p> : null}
      {state.success ? <p className="feedback feedback-correct">{state.success}</p> : null}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Uploading..." : "Upload private file"}
      </button>
    </form>
  );
}
