'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {attachTrainingSequencing} from '@/lib/training-player-sequencing';
import type {SequenceRecord} from '@/lib/learning-sequence';

/** Non-SCORM training uses the same controls without changing its completion model. */
export function SequencedTrainingFrame({courseSlug,unitSlug,src,title,completed=false,preview=false}:{courseSlug:string;unitSlug:string;src?:string;title:string;completed?:boolean;preview?:boolean}){
 const [ready,setReady]=useState(preview),[error,setError]=useState(''),records=useRef<SequenceRecord[]>([]),adapter=useRef<ReturnType<typeof attachTrainingSequencing>|null>(null);
 useEffect(()=>{if(preview)return;let active=true;void fetch(`/api/learning-sequences?courseSlug=${encodeURIComponent(courseSlug)}&unitSlug=${encodeURIComponent(unitSlug)}`,{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error();const data=await r.json();if(active){records.current=data.records;setReady(true);}}).catch(()=>{if(active)setError('Your saved activity progress could not be loaded. Reload before continuing.');});return()=>{active=false;adapter.current?.dispose();adapter.current=null;};},[courseSlug,unitSlug,preview]);
 const frame=useCallback((node:HTMLIFrameElement|null)=>{adapter.current?.dispose();adapter.current=null;if(!node)return;adapter.current=attachTrainingSequencing({host:window,frame:node,records:records.current,status:setError,completed:()=>completed,save:async record=>{if(preview)return record;const r=await fetch('/api/learning-sequences',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({courseSlug,unitSlug,record})});if(!r.ok)throw Error('Save failed');return (await r.json()).record;}});},[courseSlug,unitSlug,completed,preview]);
 return <>{error?<p role="alert">{error}</p>:null}{ready?<iframe ref={frame} title={title} src={src} allow="fullscreen" allowFullScreen/>:!error?<p role="status">Loading your saved activity progress…</p>:null}</>;
}
