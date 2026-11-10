import { ViewerEndSessionInstructions } from "./ViewerEndSessionInstructions";

export function ViewerStreamingNotice() {
  return <aside className="viewer-stream-notice" role="note" aria-label="Streaming connection notice">
      <strong>You are controlling a live streamed application</strong>
      <p>The Viewer runs securely on AWS and streams to your browser. A slow or unstable internet connection, weak Wi-Fi or mobile signal can delay control responses. Click once and allow the Viewer to respond before clicking again. A stable connection will make practice smoother.</p>
  </aside>;
}

export function ViewerPracticeGuide({ courseSlug, nextUnit, keepSession }: {
  courseSlug: string; nextUnit?: { slug: string; title: string }; keepSession: boolean;
}) {
  return <>
    <section className="unit-resources" aria-labelledby="viewer-start-heading">
      <p className="eyebrow">1 · Start your exercise</p>
      <h2 id="viewer-start-heading">Connect TrainingTool to the Viewer</h2>
      <ol className="viewer-practice-steps">
        <li>In the new streaming window, wait for the Windows session and Scannex Viewer to load.</li>
        <li>Open <strong>Catalog</strong> in the AWS toolbar and choose <strong>TrainingTool</strong>.</li>
        <li>Select <strong>Connect</strong>, using the supplied server address <strong>127.0.0.1</strong>. This connects to the training server inside your hosted session.</li>
        <li>Select <strong>Viewer 1</strong>, then <strong>LogOn</strong>. Enter your name and a practice ID, such as <strong>1</strong>, when prompted. These are exercise details, not your APGI account password.</li>
        <li>Select <strong>Scannex Viewer Practice</strong>, choose <strong>Start Exercise</strong> and confirm <strong>Yes</strong>.</li>
        <li>Return to <strong>Scannex Viewer</strong> using the open application window or the AWS Catalog. If the image starts too large, select <strong>Zoom 1/4</strong>.</li>
      </ol>
    </section>
    <section className="unit-resources" aria-labelledby="viewer-images-heading">
      <p className="eyebrow">2 · Explore the controls</p>
      <h2 id="viewer-images-heading">Practise with the available images</h2>
      <p>Keep your learning activity open alongside the Viewer. Explore navigation, pan, zoom, palettes and the image-enhancement controls covered in your unit.</p>
      <ol className="viewer-practice-steps">
        <li>When you are ready to move on from an image, select the Viewer&apos;s <strong>check-mark (✓)</strong> control to finish that image.</li>
        <li>If the <strong>Results</strong> dialog opens, select <strong>OK</strong>.</li>
        <li>Select the check-mark control again to <strong>Release</strong> the image. The next practice image loads automatically.</li>
      </ol>
      <p>You may work through as many of the available images as you wish. There is no required image count or pass mark in this practice lab. If the exercise reaches its last image, return to TrainingTool to select and start the practice exercise again.</p>
      <p className="resource-status">The practice Results dialog may show zero Right, Wrong or Missed answers because this exercise has no marked answer annotations. It is not a formal assessment result.</p>
    </section>
    <section className="unit-resources" aria-labelledby="viewer-finish-heading">
      <p className="eyebrow">3 · Finish or continue</p>
      <h2 id="viewer-finish-heading">Return to training with Viewer still open</h2>
      <p>Keep your AWS streaming window open and switch to the APGI Training tab. You can open any learning unit or resume your last saved activity from course progress. End the stream only when you have finished using Viewer.</p>
      <a className="primary-button" href={`/learn/${courseSlug}`}>Course progress &amp; all learning units</a>
      <h3>When you have finished using Viewer</h3>
      <ViewerEndSessionInstructions />
      {nextUnit ? <div className="button-row"><a className="primary-button" href={`/learn/${courseSlug}/units/${nextUnit.slug}`}>
        Continue: {nextUnit.title}
      </a></div> : null}
    </section>
  </>;
}
