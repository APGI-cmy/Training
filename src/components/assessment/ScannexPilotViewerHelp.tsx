import { useId, type RefObject } from "react";
import styles from "./ScannexPilotViewerHelp.module.css";

const IMAGE = "C:\\scannex\\Viewer Training Images\\F000000078.Tiff";

export function ScannexPilotViewerHelp({ dialogRef }: { dialogRef: RefObject<HTMLDialogElement | null> }) {
  const titleId = useId();
  const descriptionId = useId();
  return <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} aria-describedby={descriptionId}>
    <h3 id={titleId}>Set up the Viewer before recording</h3>
    <p id={descriptionId}>Keep this worksheet open. Work in the separate AWS Viewer tab and leave recording off until you see Image 78.</p>
    <ol>
      <li>
        <strong>Wait for the Viewer to get ready.</strong> The striped test pattern and a grey Review (R/W) button mean that the Viewer is not ready yet.
        If Review stays grey or the Viewer reports an error, stop and tell APGI what you see. Don’t open File Explorer or change any settings.
      </li>
      <li>
        <strong>Sign in to Scannex Review.</strong> If the launcher shows a READY message, select <strong>OK</strong>.
        Choose <strong>Review (R/W)</strong>, just to the right of the zoom buttons, and sign in within Scannex.
        If Review is still grey, don’t start recording.
      </li>
      <li>
        <strong>Check for Image 78.</strong> Wait for <strong>F000000078.Tiff</strong> to appear in the Viewer.
        Only then return to the worksheet and tick <strong>I’ve signed in and can see Image 78 in the Viewer</strong>.
      </li>
    </ol>
    <details>
      <summary>If a file picker stays open</summary>
      <p>Image 78 did not open automatically on this run. To continue the ungraded pilot, use <strong>Load Image</strong> if the file picker isn’t already open, and enter <code>{IMAGE}</code> in its file name field. The file is already on the remote desktop; don’t upload a copy. A manual load does not verify automatic loading.</p>
    </details>
    <form method="dialog">
      <button type="submit" className="primary-button">Back to the worksheet</button>
    </form>
  </dialog>;
}
