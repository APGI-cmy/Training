"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { readPreviewProgress, updatePreviewProgress } from "./PreviewProgress";

import {attachTigerPlayer} from '@/lib/tiger-player';
import {activityComplete,firstBlockedSlide,missingTigerRequirement,type TigerPolicy,type TigerProgress} from '@/lib/tiger-progression';
import {attachTrainingSequencing} from '@/lib/training-player-sequencing';
import {sequenceKey,type SequenceRecord} from '@/lib/learning-sequence';
import {learningResponse,LearningSaveError,type LearningSaveIssue} from '@/lib/learning-save';

type ScormValues = Record<string, string>;

type ScormAttempt = {
  completion_status?: string | null;
  success_status?: string | null;
  progress_measure?: number | null;
  score_raw?: number | null;
  score_scaled?: number | null;
  score_min?: number | null;
  score_max?: number | null;
  suspend_data?: string | null;
  location?: string | null;
  total_time?: string | null;
  interactions?: Record<string, string> | null;
};

function initialValues(attempt?: ScormAttempt | null): ScormValues {
  return {
    "cmi._version": "1.0",
    "cmi.learner_id": "learner",
    "cmi.learner_name": "Learner",
    "cmi.mode": "normal",
    "cmi.credit": "credit",
    "cmi.entry": attempt?.suspend_data ? "resume" : "ab-initio",
    "cmi.completion_status": attempt?.completion_status ?? "unknown",
    "cmi.success_status": attempt?.success_status ?? "unknown",
    "cmi.progress_measure": attempt?.progress_measure?.toString() ?? "",
    "cmi.score.raw": attempt?.score_raw?.toString() ?? "",
    "cmi.score.scaled": attempt?.score_scaled?.toString() ?? "",
    "cmi.score.min": attempt?.score_min?.toString() ?? "",
    "cmi.score.max": attempt?.score_max?.toString() ?? "",
    "cmi.suspend_data": attempt?.suspend_data ?? "",
    "cmi.location": attempt?.location ?? "",
    "cmi.total_time": attempt?.total_time ?? "",
    ...(attempt?.interactions ?? {})
  };
}

function toAttempt(values: ScormValues): ScormAttempt {
  const numberValue = (key: string) => {
    if (!values[key]?.trim()) return null;
    const value = Number(values[key]);
    return Number.isFinite(value) ? value : null;
  };
  const interactions = Object.fromEntries(
    Object.entries(values).filter(([key]) => key.startsWith("cmi.interactions."))
  );

  return {
    completion_status: values["cmi.completion_status"],
    success_status: values["cmi.success_status"],
    progress_measure: numberValue("cmi.progress_measure"),
    score_raw: numberValue("cmi.score.raw"),
    score_scaled: numberValue("cmi.score.scaled"),
    score_min: numberValue("cmi.score.min"),
    score_max: numberValue("cmi.score.max"),
    suspend_data: values["cmi.suspend_data"],
    location: values["cmi.location"],
    total_time: values["cmi.total_time"],
    interactions
  };
}

export function ScormPlayer({
  courseSlug,
  unitSlug,
  launchSrc,
  title,
  mode = "learner",
  immersive = false,
  returnHref,
  resourceHref,
  previewScope,
  unitId,
  navigation,
  progressionPolicy
}: {
  courseSlug: string;
  unitSlug: string;
  launchSrc: string;
  title: string;
  mode?: "learner" | "preview";
  immersive?: boolean;
  returnHref?: string;
  resourceHref?: string;
  previewScope?: string;
  unitId?: string;
  navigation?: ReactNode;
  progressionPolicy?: TigerPolicy|null;
}) {
  const valuesRef = useRef<ScormValues | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Preparing your personal learning session…");
  const saveProgressRef = useRef<(() => Promise<boolean>) | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [saveIssue,setSaveIssue]=useState<LearningSaveIssue|null>(null),[retrying,setRetrying]=useState(false);
  const learnerId=useRef<string|undefined>(undefined),sessionBlocked=useRef<LearningSaveIssue|null>(null);
  const loadProgressRef=useRef<(()=>Promise<void>)|null>(null);
  const requestProgress=useCallback(async(url:string,init?:RequestInit)=>{
    try{
      if(sessionBlocked.current)throw new LearningSaveError(sessionBlocked.current);
      return await learningResponse(await fetch(url,init));
    }catch(error){
      const issue=error instanceof LearningSaveError?error.code:'save_failed';
      if(issue!=='save_failed')sessionBlocked.current=issue;
      setSaveIssue(issue);throw error;
    }
  },[]);
  const [adapterReady,setAdapterReady]=useState(false);
  const adapter=useRef<ReturnType<typeof attachTigerPlayer>|null>(null);
  const sequencing=useRef<ReturnType<typeof attachTrainingSequencing>|null>(null);
  const sequenceRecords=useRef<SequenceRecord[]>([]),completedUnit=useRef(false);
  const tigerContext=useRef<{state:TigerProgress;version:string;edition:string}|null>(null);
  const frameRef=useCallback((frame:HTMLIFrameElement|null)=>{
    if(!frame){sequencing.current?.dispose();sequencing.current=null;adapter.current?.dispose();adapter.current=null;return;}
    const context=tigerContext.current;
    if(mode==='learner'&&progressionPolicy&&context)adapter.current=attachTigerPlayer({host:window,frame,policy:progressionPolicy,initial:context.state,status:setStatus,adapterReady:setAdapterReady,
      summaryAllowed:doc=>sequencing.current?.summaryReady(doc)??false,
      save:async(evidence)=>{
        const response=await requestProgress('/api/tiger-progress',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({courseSlug,unitSlug,expectedLearnerId:learnerId.current,version:context.version,edition:context.edition,...evidence})});
        const payload=await response.json();context.state=payload.state;return payload.state;
      }
    });
    sequencing.current=attachTrainingSequencing({host:window,frame,records:sequenceRecords.current,status:setStatus,
      completed:doc=>{
        if(completedUnit.current)return true;
        if(!progressionPolicy||!context)return false;
        const id=doc.body?.textContent?.match(/TK-LU\d{2}-(?:LA|F)\d{2}/)?.[0],activity=progressionPolicy.activities.find(a=>a.id===id);
        return !!activity&&activityComplete(progressionPolicy,adapter.current?.progressState()??context.state,activity);
      },
      forwardAllowed:mode==='learner'&&progressionPolicy&&context?slide=>firstBlockedSlide(progressionPolicy,adapter.current?.progressState()??context.state,slide)===null:undefined,
      save:async record=>{
        if(mode==='preview'){
          sequenceRecords.current=[...sequenceRecords.current.filter(r=>sequenceKey(r)!==sequenceKey(record)),record];
          if(previewScope)updatePreviewProgress(previewScope,current=>({...current,attempts:{...current.attempts,[unitSlug]:{...current.attempts[unitSlug],'apgi.sequence':JSON.stringify(sequenceRecords.current)}}}));
          return record;
        }
        const response=await requestProgress('/api/learning-sequences',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({courseSlug,unitSlug,expectedLearnerId:learnerId.current,record})});
        return (await response.json()).record as SequenceRecord;
      }
    });
  },[courseSlug,unitSlug,mode,progressionPolicy,previewScope,requestProgress]);

  async function retryProgress(){
    if(retrying)return;setRetrying(true);sessionBlocked.current=null;setSaveIssue(null);
    try{if(!ready)await loadProgressRef.current?.();else await saveProgressRef.current?.();}
    finally{setRetrying(false);}
  }

  async function returnToUnit(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (leaving || !returnHref) return;
    setLeaving(true);
    const saved = await saveProgressRef.current?.() ?? true;
    if (saved) window.location.assign(returnHref);
    else setLeaving(false);
  }

  useEffect(() => {
    let active = true;
    const endpoint = `/api/scorm?courseSlug=${encodeURIComponent(courseSlug)}&unitSlug=${encodeURIComponent(unitSlug)}`;
    const sessionExpired=(event:Event)=>{
      if(mode!=='learner'||!valuesRef.current)return;
      event.preventDefault();sessionBlocked.current='session_required';setSaveIssue('session_required');
    };
    window.addEventListener('learning:session-expired',sessionExpired);

    const installApi = (saveProgress?: () => void) => {
      let initialized = false;
      window.API_1484_11 = {
        Initialize: () => { initialized = true; return "true"; },
        Terminate: () => { saveProgress?.(); initialized = false; return "true"; },
        GetValue: (key: string) => valuesRef.current?.[key] ?? "",
        SetValue: (key: string, value: string) => {
          if (!initialized || !valuesRef.current) return "false";
          valuesRef.current[key] = String(value ?? "");
          return "true";
        },
        Commit: () => { saveProgress?.(); return "true"; },
        GetLastError: () => "0",
        GetErrorString: () => "No error",
        GetDiagnostic: () => ""
      };
    };

    if (mode === "preview") {
      const saved = previewScope ? readPreviewProgress(previewScope).attempts[unitSlug] : undefined;
      valuesRef.current = { ...initialValues(), ...saved };
      try{sequenceRecords.current=JSON.parse(saved?.['apgi.sequence']??'[]');}catch{sequenceRecords.current=[];}
      completedUnit.current=saved?.['cmi.completion_status']==='completed';
      valuesRef.current["cmi.entry"] = saved?.["cmi.suspend_data"] ? "resume" : "ab-initio";
      const savePreview = async () => {
        const values = valuesRef.current;
        if (previewScope && values) updatePreviewProgress(previewScope, current => ({
          ...current,
          attempts: { ...current.attempts, [unitSlug]: { ...values } },
          completed: unitId && values["cmi.completion_status"] === "completed" && values["cmi.success_status"] === "passed" ? [...new Set([...current.completed, unitId])] : current.completed
        }));
        return true;
      };
      installApi(() => { void savePreview(); });
      saveProgressRef.current = savePreview;
      window.addEventListener("pagehide", savePreview);
      setStatus("Learner experience preview — test progress stays in this tab.");
      setReady(true);

      return () => {
        active = false;
        void savePreview();
        saveProgressRef.current = null;
        window.removeEventListener("pagehide", savePreview);
        window.removeEventListener('learning:session-expired',sessionExpired);
        delete window.API_1484_11;
      };
    }

    // Keep commits in order so an older request cannot overwrite the return save.
    let saveQueue: Promise<boolean> = Promise.resolve(true);
    const save = () => {
      saveQueue = saveQueue.catch(()=>false).then(persistProgress);
      return saveQueue;
    };
    const persistProgress = async () => {
      if (!valuesRef.current) return true;
      if (active) setStatus("Saving your progress…");
      try {
        await sequencing.current?.flush();
        if(progressionPolicy&&adapter.current)await adapter.current.flush();
        const response = await requestProgress(endpoint, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ courseSlug, unitSlug, expectedLearnerId:learnerId.current,attempt: toAttempt(valuesRef.current) })
        });
        if(response.ok&&progressionPolicy){
          const payload=await response.json();
          if(payload.tiger?.state){tigerContext.current!.state=payload.tiger.state;adapter.current?.update(payload.tiger.state);}
          if(payload.tiger?.qualified)window.dispatchEvent(new CustomEvent('tiger:unit-qualified',{detail:{courseSlug,unitSlug,qualified:true}}));
          if(active)setStatus(payload.tiger?.state?missingTigerRequirement(progressionPolicy,payload.tiger.state):'Your progress is saved.');
          if(active)setSaveIssue(null);return true;
        }
        if (active) setStatus(response.ok
          ? "Your progress is saved to your learner record."
          : "Progress could not be saved. Keep this page open and try again.");
        if(active)setSaveIssue(null);return response.ok;
      } catch {
        if (active) setStatus("Progress could not be saved. Check your connection and try again.");
        return false;
      }
    };
    saveProgressRef.current = save;

    const load = async () => {
      const [response,sequences] = await Promise.all([requestProgress(endpoint, { cache: "no-store" }),requestProgress(`/api/learning-sequences?courseSlug=${encodeURIComponent(courseSlug)}&unitSlug=${encodeURIComponent(unitSlug)}`,{cache:'no-store'})]);
      if(!sequences.ok)throw Error('Saved activity sequence unavailable');
      sequenceRecords.current=(await sequences.json()).records;
      if(progressionPolicy&&!response.ok)throw Error('Saved progress unavailable');
      const payload = response.ok ? await response.json() : { attempt: null };
      learnerId.current=payload.learnerId;
      if(progressionPolicy){
        const evidence=await requestProgress(`/api/tiger-progress?courseSlug=${encodeURIComponent(courseSlug)}&unitSlug=${encodeURIComponent(unitSlug)}`,{cache:'no-store'});
        if(!evidence.ok)throw Error('Viewing requirements unavailable');
        const saved=await evidence.json();
        if(!active)return;
        tigerContext.current={state:saved.state,version:saved.version,edition:saved.edition};
      }
      if (!active) return;
      valuesRef.current = initialValues(payload.attempt);
      completedUnit.current=payload.attempt?.completion_status==='completed';
      installApi(() => { void save(); });
      setStatus("Your progress is saved to your learner record.");
      setSaveIssue(null);
      setReady(true);
    };

    loadProgressRef.current=()=>load().catch(()=>{if(active)setStatus('Your saved progress could not be loaded. Retry before continuing.');});
    void loadProgressRef.current();
    const saveBeforeLeaving = () => { void save(); };
    window.addEventListener("pagehide", saveBeforeLeaving);
    return () => {
      sequencing.current?.dispose();sequencing.current=null;
      adapter.current?.dispose();adapter.current=null;
      active = false;
      saveProgressRef.current = null;
      window.removeEventListener("pagehide", saveBeforeLeaving);
      window.removeEventListener('learning:session-expired',sessionExpired);
      loadProgressRef.current=null;
      void save();
      delete window.API_1484_11;
    };
  }, [courseSlug, mode, unitSlug, previewScope, unitId, progressionPolicy,requestProgress]);

  return (
    <section className={immersive ? "scorm-player-immersive" : undefined} aria-label={`${title} SCORM learning activity`}>
      {saveIssue?<div role="alert" className="learning-save-recovery" style={{padding:16,border:'2px solid #bd7b00',background:'#fff3cf',color:'#172b46'}}>
        <strong>{saveIssue==='session_required'?'Sign in again to save your progress.':saveIssue==='learner_changed'?'Sign in with the original learner account.':'Your latest progress has not been saved yet.'}</strong>
        <p>Keep this training tab open. {saveIssue==='save_failed'?'Check your connection, then retry.':'Open sign-in in a separate tab, complete sign-in, then return here and retry saving.'} Pending work stays in this tab; Next unlocks when the required work is saved.</p>
        {saveIssue!=='save_failed'?<a className="secondary-button" href={`/alp-sign-in?next=${encodeURIComponent('/learn/'+courseSlug)}`} target="_blank" rel="noreferrer">Sign in in a separate tab</a>:null}
        {' '}<button type="button" className="primary-button" disabled={retrying} onClick={()=>void retryProgress()}>{retrying?'Saving…':'Retry saving progress'}</button>
      </div>:null}
      {immersive && returnHref ? (
        <nav className="activity-toolbar" aria-label="Learning activity navigation">
          <a className="secondary-button" href={returnHref} onClick={returnToUnit} aria-disabled={leaving}>
            <span aria-hidden="true">←</span> {leaving ? "Saving…" : "Back to unit"}
          </a>
          <p className="activity-save-status" role="status">{status}</p>
          {resourceHref ? <a className="primary-button" href={resourceHref} target="_blank" rel="noreferrer">Open Scannex e-book</a> : null}
          {navigation}
        </nav>
      ) : null}
      {!immersive && <p className="scorm-status" role="status">{status}</p>}
      {ready ? (
        <figure className="media-item">
          {mode==='learner'&&progressionPolicy&&!adapterReady?<p role="status">Checking presentation requirements…</p>:null}
          <iframe ref={frameRef} style={mode==='learner'&&progressionPolicy&&!adapterReady?{visibility:'hidden'}:undefined} title={`${title} activities and quizzes`} src={launchSrc} allow="fullscreen" allowFullScreen />
          {!immersive && (
            <figcaption>
              {mode === "preview"
                ? "Administrator preview only — this activity cannot create or change learner progress."
                : "Complete the learning activities and quizzes here. Your resume point and results belong to your learner account."}
            </figcaption>
          )}
        </figure>
      ) : null}
    </section>
  );
}

declare global {
  interface Window {
    API_1484_11?: Record<string, unknown>;
  }
}
