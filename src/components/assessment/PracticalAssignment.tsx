"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { INTEGRITY_DECLARATION, LEARNER_SCANNEX_WORKFLOW, ORDERED_SCANNEX_PREVIEW, applySingleTimingSource, newDocument, requiresExercisePractice, submissionIssues,
  type AssignmentDocument, type CasePack, type CaseWorksheet, type ExerciseStep, type PracticalAssignment as Assignment, type PracticalFile
} from "@/lib/assessments/scannex-assignment";
import { RECORDING_ONLY_STEPS, STEP_COPY, canOpenExercise, exerciseProgress } from "@/lib/assessments/scannex-workflow";
import { PracticalChecklist, PrintChecklistButton } from "./PracticalChecklist";
import { PracticalDecisionFields, PracticalFindingsFields, PracticalLearnerDeclaration, PracticalModeFields, PracticalScanFields } from "./PracticalExerciseFields";
import { PracticalPaperChecklist } from "./PracticalPaperChecklist";
import { PracticalEvidence } from "./PracticalEvidence";
import { practicalRequest, type PracticalTransport } from "./practical-client";
import "./practical.css";

export type PracticalWorkspace = { assignment: Assignment | null; pack: Pick<CasePack, "learner_cases"> | null; files: PracticalFile[]; name: string; learningComplete: boolean; reference?: string; submissions: [] };
type Workspace = PracticalWorkspace;
type Location = { page: "start" | "submit" } | { page: "exercise"; index: number; step: ExerciseStep };
type StepStatus = "complete" | "pending" | "locked";
type PreviewViewerAccess = { overview: ReactNode; connect: ReactNode | ((exerciseNumber: number) => ReactNode); sessionStatus: ReactNode; canConfirm: boolean; guideHref?: string; orderedReview?: boolean; tabOnly?: boolean; checklistHref?: string };
const START: Location = { page: "start" };
const SUBMIT: Location = { page: "submit" };
const EXERCISES = [0, 1, 2] as const;
const NO_FILES: PracticalFile[] = [];
const RECORDING_ONLY_COPY: Partial<Record<ExerciseStep, string>> = {
  viewer: "Sign in to APGI Training with your course account. Open the assessment Viewer, finish any Scannex Viewer sign-in, and make the Viewer fill your screen. Confirm the image is ready before recording.",
  recording: "Start recording before you scan. Follow the checklist. If you marked a candidate, leave its annotation and comment visible for a few seconds. Then select Stop & save recording and wait for confirmation.",
  scan: "Describe the four viewing modes and enter the actual checkpoint times and outcomes for the six scan regions."
};
const ORDERED_STEPS: Partial<Record<ExerciseStep, { title: string; instruction: string }>> = {
  scan: { title: "Confirm Auto Pan", instruction: "Confirm the full feet-to-head sweep and record the actual checkpoint times and outcomes. Do not invent missing times." },
  findings: { title: "Rule out, then review", instruction: "Record your exclusions with reasons first. Locate the flagged anomaly, then show it at each Viewer zoom level in your recording. Only flagged findings need the detailed checklist." },
  decision: { title: "Finish with Hold or Release", instruction: "Record the action you selected in the Viewer and explain why. Hold if any flagged finding remains unexplained; release only when all findings have been ruled out." },
};

function StepButton({ title, status, detail, current, disabled, select }: {
  title: string; status: StepStatus; detail: string; current: boolean; disabled?: boolean; select: () => void;
}) {
  return <button type="button" className="pa-step" data-status={status} aria-current={current ? "step" : undefined}
    disabled={disabled || status === "locked"} onClick={select}>
    <span className="pa-step-icon" aria-hidden="true">{status === "complete" ? "✓" : status === "locked" ? "–" : "!"}</span>
    <span><strong>{title}</strong><small>{detail}</small></span>
  </button>;
}

export function PracticalAssignment({ previewViewerAccess, pilotTransport, workflowTest = false }: { previewViewerAccess?: PreviewViewerAccess; pilotTransport?: PracticalTransport; workflowTest?: boolean } = {}) {
  const request = pilotTransport?.request ?? practicalRequest;
  const image78Pilot = Boolean(pilotTransport && !workflowTest);
  const exerciseIndexes = image78Pilot ? [0] : EXERCISES;
  const exerciseTotal = exerciseIndexes.length;
  const guidedDeclaration = !image78Pilot;
  const recordingFirst = true;
  const orderedReview = true;
  const policy = guidedDeclaration ? LEARNER_SCANNEX_WORKFLOW : ORDERED_SCANNEX_PREVIEW;
  const exerciseSteps: readonly ExerciseStep[] = RECORDING_ONLY_STEPS;
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [doc, setDoc] = useState<AssignmentDocument | null>(null);
  const [savedDoc, setSavedDoc] = useState<AssignmentDocument | null>(null);
  const [location, setLocation] = useState<Location>(START);
  const [started, setStarted] = useState(false);
  const [message, setMessage] = useState("Loading your assignment…"), [busy, setBusy] = useState(false), [evidenceBusy, setEvidenceBusy] = useState(false);
  const [signature, setSignature] = useState(""), [declaration, setDeclaration] = useState(false);
  const docRef = useRef(doc), workspaceRef = useRef(workspace), lastSaved = useRef(""), currentVersion = useRef(0);
  const writing = useRef<Promise<boolean> | null>(null), saveError = useRef(false);
  const focusHeading = useRef<HTMLHeadingElement>(null), moved = useRef(false);
  docRef.current = doc; workspaceRef.current = workspace;

  function receive(next: Workspace) {
    const a = next.assignment;
    const existing = a && "version" in a.document ? a.document as AssignmentDocument : null;
    const current = existing ?? (a && next.pack ? newDocument(next.pack.learner_cases) : null);
    setWorkspace(next); setDoc(current); setSavedDoc(existing);
    currentVersion.current = a?.draft_version ?? 0;
    lastSaved.current = JSON.stringify(current); saveError.current = false;
    if (a?.status === "submitted" || a?.status === "assessed") {
      setStarted(true); setLocation(SUBMIT);
    }
  }
  useEffect(() => {
    let active = true;
    request<Workspace>().then(next => { if (active) { receive(next); setMessage(""); } })
      .catch(e => { if (active) setMessage(e.message); });
    return () => { active = false; };
  }, [request]);

  function saveDraft(): Promise<boolean> {
    if (writing.current) return writing.current;
    const a = workspaceRef.current?.assignment, current = docRef.current;
    if (!a || !current || (a.status !== "draft" && a.status !== "changes_requested")) return Promise.resolve(true);
    const sent = JSON.stringify(current);
    if (sent === lastSaved.current) return Promise.resolve(true);
    setMessage("Saving worksheet…");
    const pendingSave = request<{ assignment: Assignment }>("", { operation: "save", id: a.id, expectedVersion: currentVersion.current, document: current })
      .then(({ assignment }) => {
        lastSaved.current = sent; currentVersion.current = assignment.draft_version; saveError.current = false;
        setSavedDoc(current);
        setWorkspace(w => w?.assignment?.id === assignment.id ? { ...w, assignment } : w);
        setMessage("Worksheet saved.");
        return true;
      }).catch(e => { saveError.current = true; setMessage(e.message); return false; })
      .finally(() => { writing.current = null; });
    writing.current = pendingSave;
    return pendingSave;
  }
  async function flushDraft() {
    // A previous autosave may have started before the latest edit.
    for (let n = 0; n < 2; n++) {
      if (!(await saveDraft())) return false;
      if (JSON.stringify(docRef.current) === lastSaved.current) return true;
    }
    setMessage("Some edits still need saving. Try Save & continue again.");
    return false;
  }
  useEffect(() => {
    if (!doc || saveError.current) return;
    const timer = setTimeout(() => { void saveDraft(); }, 1000);
    return () => clearTimeout(timer);
  }, [doc]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (writing.current || evidenceBusy || (docRef.current && JSON.stringify(docRef.current) !== lastSaved.current)) e.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [evidenceBusy]);
  useEffect(() => {
    if (moved.current) { focusHeading.current?.focus(); moved.current = false; }
  }, [location]);

  const a = workspace?.assignment, pack = workspace?.pack, files = workspace?.files ?? NO_FILES;
  const frozen = a?.status === "submitted" || a?.status === "assessed";
  const locked = !a || (a.status !== "draft" && a.status !== "changes_requested");
  useEffect(() => {
    if (!recordingFirst || locked) return;
    setDoc(d => {
      if (!d) return d;
      const sources = guidedDeclaration ? files.filter(f => f.kind === "recording") : files;
      const cases = d.cases.map(c => applySingleTimingSource(c, sources));
      if (cases.every((c, i) => c === d.cases[i])) return d;
      saveError.current = false;
      return { ...d, cases };
    });
  }, [files, locked, recordingFirst, guidedDeclaration]);
  const progress = doc?.cases.map((c, i) => exerciseProgress(c, savedDoc?.cases[i], files, i, policy)) ?? [];
  const allDone = progress.length === exerciseTotal && progress.every(p => p.done);
  const completedExercises = frozen ? exerciseTotal : progress.filter(p => p.done).length;
  const introRead = started || frozen;
  const index = location.page === "exercise" ? location.index : -1;
  const exercise = doc?.cases[index], item = pack?.learner_cases[index];
  const active = progress[index];
  const canNavigate = !busy && !evidenceBusy;

  function present(target: Location) { moved.current = true; setLocation(target); }
  function change(fn: (draft: AssignmentDocument) => void) {
    if (locked || busy) return;
    saveError.current = false;
    setDoc(current => {
      if (!current) return current;
      const next = structuredClone(current); fn(next); return next;
    });
  }
  const changeExercise = (fn: (draft: CaseWorksheet) => void) => change(d => { if (d.cases[index]) fn(d.cases[index]); });
  function resume(w: Workspace, value?: AssignmentDocument | null) {
    const current = value ?? (w.assignment && "version" in w.assignment.document ? w.assignment.document as AssignmentDocument : null);
    const found = current?.cases.findIndex((c, i) => !exerciseProgress(c, c, w.files, i, policy).done) ?? 0;
    if (found < 0 && current?.cases.length === exerciseTotal) return SUBMIT;
    const i = found < 0 ? 0 : found;
    return { page: "exercise", index: i, step: current?.cases[i] ? exerciseProgress(current.cases[i], current.cases[i], w.files, i, policy).first : "viewer" } as const;
  }
  async function begin() {
    if (!a || !workspace || !canNavigate || frozen || !workspace.learningComplete) return;
    setBusy(true);
    try {
      if (a.status === "assigned") {
        const next = await request<Workspace>("", { operation: "start", id: a.id });
        receive(next); setStarted(true); present(resume(next)); setMessage("Practical draft opened.");
      } else {
        if (!(await flushDraft())) return;
        setStarted(true); present(resume(workspace, docRef.current));
      }
    } catch (e) { setMessage((e as Error).message); }
    finally { setBusy(false); }
  }
  async function navigate(target: Location) {
    if (!canNavigate || (target.page === "exercise" && !canOpenExercise(target.index, progress)) || (target.page === "submit" && !frozen && !allDone)) return;
    setBusy(true);
    try {
      if (!locked && !(await flushDraft())) return;
      present(target);
    } finally { setBusy(false); }
  }
  async function nextInExercise(step: ExerciseStep) {
    if (!canNavigate || !active || active.steps[step].issues.length) return;
    setBusy(true);
    try {
      if (!(await flushDraft())) return;
      const latest = docRef.current;
      if (!latest) return;
      const p = exerciseProgress(latest.cases[index], latest.cases[index], files, index, policy);
      const n = exerciseSteps.indexOf(step);
      if (!exerciseSteps.slice(0, n + 1).every(s => p.steps[s].done)) {
        setMessage("An earlier step still needs attention. Return to it before continuing.");
        return;
      }
      if (n + 1 < exerciseSteps.length) {
        present({ page: "exercise", index, step: exerciseSteps[n + 1] });
      } else if (index + 1 < latest.cases.length) {
        const j = index + 1;
        present({ page: "exercise", index: j, step: exerciseProgress(latest.cases[j], latest.cases[j], files, j, policy).first });
      } else present(SUBMIT);
    } finally { setBusy(false); }
  }
  async function submit() {
    if (image78Pilot || !a || !doc || !workspace || !allDone || !canNavigate || locked || !declaration ||
      signature.trim() !== workspace.name || !workspace.name || submissionIssues(doc, files, policy).length) return;
    setBusy(true);
    try {
      if (!(await flushDraft())) return;
      receive(await request<Workspace>("", { operation: "submit", id: a.id, expectedVersion: currentVersion.current, signedName: signature, declaration }));
      setMessage(workflowTest ? "Test submission complete in this tab. Nothing was sent to APGI." : "Assignment submitted for assessor review. No mark has been awarded.");
    } catch (e) { setMessage((e as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="pa-workspace pa-guided" id="practical-workflow">
    <PracticalChecklist recordingFirst={recordingFirst} orderedReview={orderedReview} guidedDeclaration={guidedDeclaration} />
    <header className="pa-card pa-workflow-status">
      <div><p className="eyebrow">Practical assignment · Part B</p><h2>Your practical workflow</h2></div>
      <p role="status" aria-live="polite">{message || `${completedExercises} of ${exerciseTotal} ${image78Pilot ? "pilot exercises" : "exercises"} complete`}</p>
    </header>
    {previewViewerAccess?.sessionStatus}
    <div className="pa-workflow-layout">
      <nav className="pa-card pa-workflow-rail" aria-label="Practical workflow">
        <p className="pa-rail-title">Your progress</p>
        <progress value={completedExercises} max={exerciseTotal} aria-label="Exercises completed" />
        <p className="pa-legend"><span>✓ Complete</span><span>! Action needed</span><span>– Locked</span></p>
        <StepButton title="Start here" status={introRead ? "complete" : "pending"} detail={introRead ? "Instructions acknowledged" : "Read & print the checklist"}
          current={location.page === "start"} disabled={!canNavigate} select={() => void navigate(START)} />
        {exerciseIndexes.map(i => {
          const unlocked = introRead && !locked && canOpenExercise(i, progress);
          const p = progress[i], done = frozen || p?.done;
          const target = { page: "exercise", index: i, step: p?.first ?? "viewer" } as const;
          return <StepButton key={i} title={`Exercise ${i + 1}`} status={done ? "complete" : unlocked ? "pending" : "locked"}
            detail={done ? "Evidence and worksheet saved" : unlocked ? `${exerciseSteps.filter(s => p?.steps[s].done).length} of ${exerciseSteps.length} steps saved` : (i ? `Complete Exercise ${i} first` : "Start with the instructions")}
            current={index === i} disabled={!canNavigate || !unlocked} select={() => void navigate(target)} />;
        })}
        <StepButton title={image78Pilot ? "Review pilot" : "Review & submit"} status={frozen ? "complete" : introRead && allDone ? "pending" : "locked"}
          detail={image78Pilot ? (allDone ? "Check the saved pilot worksheet" : "Complete the Image 78 exercise") : frozen ? workflowTest ? "Test submission complete" : "Submitted for review" : allDone ? "Sign your declaration" : "Complete all three exercises"}
          current={location.page === "submit"} disabled={!canNavigate || (!frozen && !allDone)} select={() => void navigate(SUBMIT)} />
        <p className="pa-rail-note">Green means the required entries or files are saved. Only your assessor decides whether the work is correct.</p>
      </nav>

      <div className="pa-workflow-body">
        {location.page === "start" ? <section className="pa-card" aria-labelledby="pa-start-title">
          <p className="eyebrow">Start here</p>
          <h2 id="pa-start-title" ref={focusHeading} tabIndex={-1}>Before you start the practical</h2>
          {image78Pilot ? <p>You will test <strong>one ungraded Viewer exercise: Image 78</strong>. This checks the workflow only. The released assessment will have three assigned exercises.</p>
            : workflowTest ? <p>You will complete <strong>three exercises with synthetic test images</strong>. Try both Hold and Release to check how the worksheet responds. There are no correct answers or marks in this test.</p>
              : <p>You will complete <strong>three Scannex Viewer exercises</strong>. Some images contain concealed diamonds and others do not. Your task is to follow the same checks on every image and explain the decision you reach.</p>}
          {previewViewerAccess?.overview}
          <ol className="pa-start-list">
            <li><strong>Print the learner checklist.</strong> {orderedReview ? "Keep one copy per image. Use the detailed review grid only for flagged findings and label the copy with the image and annotation reference." : "Keep it beside you and tick each exercise column as you demonstrate the actions."}</li>
            <li><strong>Open the Viewer.</strong> {image78Pilot ? "Select Open Scannex Viewer from this worksheet. Finish Review sign-in and confirm that Image 78 is visible. Do not use the learner practice Viewer." : workflowTest ? "Open the test Viewer from each exercise. When Edge asks what to share, select that Viewer tab, not this worksheet." : "Open the assessment Viewer connection supplied by APGI. Keep the same session for all three exercises. If you can’t see the correct assigned image, stop and contact APGI; don’t load your own image or use the practice session."}</li>
            <li><strong>Record each exercise before you start the scan.</strong> {recordingFirst ? "Share the assessment Viewer. When you finish, select Stop & save recording. The recording attaches automatically; you don't need to download or upload anything." : "Share the entire assessment Viewer tab or window. If you have a clean display dedicated to the assessment, you can explicitly choose to record that entire display. The recording is saved privately to APGI Training."}</li>
            <li><strong>Save your Hold or Release declaration after each live run.</strong> {image78Pilot ? "Review the clip and worksheet in this tab. Nothing is submitted or scored. Save a private backup if you need to keep the recording." : "Finish and save Exercise 1 to unlock Exercise 2, then repeat for Exercise 3. For Exercises 2 and 3, make and check one practice recording before going live. Sign and submit once at the end."}</li>
          </ol>
          <div className="button-row">{previewViewerAccess?.checklistHref
            ? <a className="secondary-button" href={previewViewerAccess.checklistHref} download>Download and print the Viewer checklist (PDF)</a>
            : <PrintChecklistButton />}
            {a && !frozen ? <button className="primary-button" type="button" disabled={!canNavigate || !workspace?.learningComplete} onClick={() => void begin()}>
              {a.status === "assigned" ? "Read and ready — start Exercise 1" : "Read and ready — continue my draft"}
            </button> : null}
            {frozen ? <button className="primary-button" type="button" disabled={!canNavigate} onClick={() => void navigate(SUBMIT)}>View my submitted report</button> : null}
          </div>
          {workspace && !a ? <p className="pa-notice"><strong>You can prepare now.</strong> Read and print the checklist. Exercise 1 unlocks when APGI assigns your approved three-exercise set.</p> : null}
          {a?.status === "changes_requested" ? <p className="pa-notice">APGI has asked you to revise your submission. Continue your draft and contact APGI if you need guidance.</p> : null}
          {a && !workspace?.learningComplete && !frozen ? <p className="pa-notice">Complete LU1–LU8 before starting the practical.</p> : null}
        </section> : null}

        {location.page === "exercise" && exercise && item && active && a ? (() => {
          const step = location.step, n = exerciseSteps.indexOf(step);
          const earlierDone = exerciseSteps.slice(0, n).every(s => active.steps[s].done);
          const current = active.steps[step];
          const stepLabel = guidedDeclaration && step === "decision" ? { title: "Declare Hold or Release", instruction: "Record the action you took and explain why. If you held the scanned person, select the body area to open the Scannex checklist." } : (ORDERED_STEPS[step] ?? STEP_COPY[step]);
          const needsReview = exercise.candidates.some(c => c.elimination !== "excluded");
          return <>
            <header className="pa-card pa-exercise-head"><p className="eyebrow">Exercise {index + 1} of {exerciseTotal}</p>
              <h2>Exercise {index + 1} · {item.title}</h2>
              {item.brief ? <p>{item.brief}</p> : null}
              {workspace?.reference ? <p className="pa-subtle">Assessment reference: {workspace.reference}</p> : null}
              <nav className="pa-exercise-steps" aria-label={`Exercise ${index + 1} steps`}>
                {exerciseSteps.map((s, j) => {
                  const available = exerciseSteps.slice(0, j).every(previous => active.steps[previous].done);
                  const status = active.steps[s].done ? "complete" : available || s === step ? "pending" : "locked";
                  return <StepButton key={s} title={`${j + 1}. ${guidedDeclaration && s === "decision" ? "Declare Hold or Release" : (ORDERED_STEPS[s] ?? STEP_COPY[s]).title}`} status={status}
                    detail={status === "complete" ? "Saved" : status === "locked" ? "Finish the earlier step" : "Action needed"} current={step === s}
                    disabled={!canNavigate || (!available && s !== step)} select={() => void navigate({ page: "exercise", index, step: s })} />;
                })}
              </nav>
            </header>
            <section className="pa-card" aria-labelledby="pa-exercise-step-title">
              <p className="eyebrow">Step {n + 1} of {exerciseSteps.length}</p><h3 id="pa-exercise-step-title" ref={focusHeading} tabIndex={-1}>{stepLabel.title}</h3>
              <p>{(orderedReview ? ORDERED_STEPS[step]?.instruction : undefined) ?? (recordingFirst ? RECORDING_ONLY_COPY[step] : undefined) ?? stepLabel.instruction}</p>
              {orderedReview && step === "recording" ? <>
                <ol>
                  <li><strong>Auto Pan:</strong> Start the recording, zoom out for orientation and use Auto Pan to sweep the full image from feet to head. Check the six regions.</li>
                  <li><strong>Rule out and explain:</strong> Annotate each obvious lookalike in the Viewer and enter a native comment explaining the visible evidence that rules it out.</li>
                  <li><strong>Flag, then investigate:</strong> Annotate anything you cannot explain. Review each flagged finding yourself using F1–F4, readable settings and zoom. Use the detailed checklist only for these findings.</li>
                  <li><strong>Demonstrate zoom:</strong> Once you locate the flagged anomaly, centre it and show it at ¼×, ½×, 1×, 2× and 4×. Re-centre it if needed and leave it visible at each level.</li>
                  <li><strong>Finish:</strong> Show the annotations and comments, select Hold or Release in the Viewer, then stop and save the recording. {image78Pilot ? "In this ungraded pilot, use the worksheet if those Viewer controls are unavailable." : "You’ll record the same decision in your declaration after saving the clip."}</li>
                </ol>
                {previewViewerAccess?.checklistHref ? <p><a href={previewViewerAccess.checklistHref} download>Download the checklist to use alongside the Viewer</a></p> : null}
              </> : null}
              {step === "viewer" ? typeof previewViewerAccess?.connect === "function" ? previewViewerAccess.connect(index + 1) : previewViewerAccess?.connect : null}
              {step === "viewer" ? <fieldset disabled={busy || locked}>
                <p><strong>Assigned exercise:</strong> {item.title}. If it is missing or the reference doesn’t match, ask your assessor before recording.</p>
                <label className="pa-check"><input type="checkbox" disabled={Boolean(previewViewerAccess && !previewViewerAccess.canConfirm && !exercise.viewerReady)} checked={exercise.viewerReady ?? false} onChange={e => {
                  const ready = e.target.checked;
                  change(d => { d.cases[index].viewerReady = ready; if (ready) { d.preparation.viewerOpened = true; d.preparation.correctImages = true; } });
                }} /> {image78Pilot ? "I’ve signed in and can see Image 78 in the Viewer." : workflowTest ? `I can see Test Image ${index + 1} in the test Viewer.` : "I’ve signed in and can see this assigned preloaded exercise."}</label>
              </fieldset> : null}
              {step === "scan" ? <fieldset disabled={busy || locked}><PracticalScanFields value={exercise} change={changeExercise} item={item} files={guidedDeclaration ? files.filter(f => f.kind === "recording") : files} recordingFirst={recordingFirst} orderedReview={orderedReview} /></fieldset> : null}
              {step === "findings" ? <fieldset disabled={busy || locked}>
                <PracticalFindingsFields value={exercise} change={changeExercise} orderedReview={orderedReview} guidedDeclaration={guidedDeclaration} />
                {!guidedDeclaration && orderedReview && exercise.screeningComplete && needsReview ? exercise.checklistSource === "paper" ?
                  <PracticalPaperChecklist key={exercise.caseId} assignmentId={a.id} imageId={exercise.caseId} imageLabel={item.title} files={files} locked={locked} onBusy={setEvidenceBusy} pilotTransport={pilotTransport}
                    onSaved={file => setWorkspace(w => w ? { ...w, files: [...w.files.filter(f => f.id !== file.id), file] } : w)} /> :
                  <PracticalModeFields value={exercise} change={changeExercise} item={item} orderedReview /> : null}
              </fieldset> : null}
              {step === "decision" ? <fieldset disabled={busy || locked}>{guidedDeclaration ? <PracticalLearnerDeclaration value={exercise} change={changeExercise} item={item} /> : <PracticalDecisionFields value={exercise} change={changeExercise} orderedReview={orderedReview} />}</fieldset> : null}
            </section>
            <PracticalEvidence key={exercise.caseId} phase={step === "recording" || step === "evidence" ? step : "hidden"}
              assignmentId={a.id} caseId={exercise.caseId} files={files} locked={locked || !earlierDone} onBusy={setEvidenceBusy} recordingFirst={recordingFirst} guideHref={previewViewerAccess?.guideHref}
              viewerReady={previewViewerAccess?.canConfirm} tabOnly={previewViewerAccess?.tabOnly} pilotTransport={pilotTransport}
              liveRecordingRequired={guidedDeclaration} practiceReviewed={exercise.practiceReviewed}
              onPracticeReviewed={requiresExercisePractice(index, policy) ? () => changeExercise(d => { d.practiceReviewed = true; }) : undefined}
              onSaved={file => setWorkspace(w => w ? { ...w, files: [...w.files.filter(f => f.id !== file.id), file] } : w)} />
            <footer className="pa-card pa-step-actions">
              {!earlierDone ? <p className="pa-pending-note">Go back and finish the earlier steps before continuing.</p> : null}
              {!evidenceBusy && current.issues.length ? <ul className="pa-pending-note" aria-label="What is still needed">{current.issues.map(issue => <li key={issue}>{issue}</li>)}</ul> : null}
              <div className="button-row">
                <button type="button" className="secondary-button" disabled={!canNavigate}
                  onClick={() => void navigate(n > 0 ? { page: "exercise", index, step: exerciseSteps[n - 1] } : START)}>Back</button>
                <button type="button" className="primary-button" disabled={!canNavigate || !earlierDone || current.issues.length > 0}
                  onClick={() => void nextInExercise(step)}>{n + 1 === exerciseSteps.length ? (image78Pilot ? "Save & review pilot" : index === 2 ? "Save & review assignment" : `Save & go to Exercise ${index + 2}`) : recordingFirst && step === "recording" ? "Continue to scan checks" : "Save & continue"}</button>
                <button type="button" className="secondary-button" disabled={!canNavigate || locked} onClick={() => void saveDraft()}>Save draft</button>
              </div>
            </footer>
          </>;
        })() : null}

        {location.page === "submit" ? <section className="pa-card" aria-labelledby="pa-submit-title">
          <h2 ref={focusHeading} tabIndex={-1} id="pa-submit-title">{image78Pilot ? "Review your Image 78 pilot" : a?.status === "assessed" ? "Review complete" : frozen ? workflowTest ? "Test submission complete" : "Submitted for assessor review" : "Review & submit"}</h2>
          {image78Pilot ? <>
            <p>Nothing was submitted or marked. Your recording and worksheet remain in this browser tab.</p>
            <p>{doc?.cases[0].summary || "No conclusion saved."}</p>
            <button type="button" disabled={!canNavigate} onClick={() => void navigate({ page: "exercise", index: 0, step: "recording" })}>Return to the pilot recording</button>
          </> : frozen ? <>
            <p>{workflowTest ? "You completed all three exercises. Nothing was sent to APGI, marked, or written to a learner record. Reload to start a new test." : a?.status === "assessed" ? "APGI has reviewed your submission. Your submitted worksheet and evidence are locked." : "Your submission is locked. APGI will review your worksheet and recording."}</p>
          </> : doc ? <>
            <p>Review the three saved decisions before you sign. {workflowTest ? "Use the sample name Test Learner. This submission stays in your tab." : "Submission locks this version of the report and evidence for the assessor."}</p>
            <ol className="pa-review-list">{doc.cases.map((c, i) => <li key={c.caseId}>
              <strong>Exercise {i + 1} · {c.decision.toUpperCase()}</strong><p>{c.summary || "Conclusion not yet recorded."}</p>
              <button type="button" disabled={!canNavigate} onClick={() => void navigate({ page: "exercise", index: i, step: progress[i]?.first ?? "viewer" })}>{progress[i]?.done ? "Review these steps" : "Finish this exercise"}</button>
            </li>)}</ol>
            <fieldset disabled={busy || !allDone}>
              <label className="pa-check"><input type="checkbox" checked={doc.preparation.systematicScan} onChange={e => { const checked = e.target.checked; change(d => { d.preparation.systematicScan = checked; }); }} /> I followed the taught systematic scan procedure and recorded the actual timings.</label>
              <p>Sign using your APGI profile name: <strong>{workspace?.name || "Complete your profile first"}</strong>.</p>
              <label>Type your full profile / certificate name<input maxLength={200} autoComplete="name" value={signature} onChange={e => setSignature(e.target.value)} /></label>
              <label className="pa-check"><input type="checkbox" checked={declaration} onChange={e => setDeclaration(e.target.checked)} />{INTEGRITY_DECLARATION}</label>
            </fieldset>
            {!allDone ? <p className="pa-pending-note">Finish the outstanding exercise steps before submitting.</p> : null}
            <div className="button-row"><button type="button" className="primary-button" disabled={!canNavigate || !allDone || !workspace?.name || !declaration || signature.trim() !== workspace.name || submissionIssues(doc, files, policy).length > 0} onClick={() => void submit()}>Submit assignment for review</button>
              <button type="button" className="secondary-button" disabled={!canNavigate || locked} onClick={() => void saveDraft()}>Save draft instead</button></div>
          </> : null}
        </section> : null}
      </div>
    </div>
  </div>;
}
