import {activityKey,firstBlockedSlide,mergeWatchedRanges,missingTigerRequirement,type TigerPolicy,type TigerProgress,type WatchedRange} from './tiger-progression';

type Dispatcher={addHandler:(handler:()=>void)=>void;removeHandler:(handler:()=>void)=>void};
export type TigerNativePlayer={presentation:()=>{slides:()=>{count:()=>number}};view:()=>{displayObject:()=>HTMLElement;playbackController:()=>{currentSlideIndex:()=>number;gotoSlide:(index:number,play?:boolean)=>void;slideChangeEvent:()=>Dispatcher;pause:()=>void}}};
type Evidence={ranges?:WatchedRange[];summary?:string};
type Connector={register:(player:TigerNativePlayer)=>void};
export function attachTigerPlayer(options:{host:Window;frame:HTMLIFrameElement;policy:TigerPolicy;initial:TigerProgress;save:(evidence:Evidence)=>Promise<TigerProgress>;status:(message:string)=>void;adapterReady:(ready:boolean)=>void}) {
  const {host,frame,policy}=options;
  const connectorHost=host as unknown as {ispringPresentationConnector?:Connector};
  const previous=connectorHost.ispringPresentationConnector;
  let active=true,state=options.initial,player:TigerNativePlayer|null=null,releasePlayer:(()=>void)|undefined,redirecting=false;
  let ranges=state.video_ranges,queue=Promise.resolve(state),lastSent=Date.now(),pending=0;
  const cleanup:Array<()=>void>=[],summaryPending=new Set<string>(),observedVideos=new WeakSet<HTMLVideoElement>(),observedSummaries=new WeakMap<Document,number>();
  const currentSlide=()=>{try{return player?player.view().playbackController().currentSlideIndex()+1:0;}catch{return 0;}};
  const send=(evidence:Evidence)=>{
    pending++;
    const request=queue.then(async()=>{
      if(!active)return state;
      const saved=await options.save(evidence);
      if(!active)return saved;
      state=saved;ranges=mergeWatchedRanges([...ranges,...saved.video_ranges],policy.duration);
      options.status(missingTigerRequirement(policy,state));return state;
    }).finally(()=>{pending--;});
    queue=request.catch(()=>{if(active)options.status('Progress could not be saved. Keep this page open and retry.');return state;});
    return request;
  };
  const flush=()=>send({ranges});
  const isVisible=(element:Element)=>{
    const rect=element.getBoundingClientRect(),win=element.ownerDocument.defaultView;
    return !!win&&rect.width>0&&rect.height>0&&rect.bottom>0&&rect.right>0&&rect.top<win.innerHeight&&rect.left<win.innerWidth&&win.getComputedStyle(element).visibility!=='hidden'&&win.getComputedStyle(element).display!=='none';
  };
  const documents=()=>{
    const found:Document[]=[];
    const visit=(child:HTMLIFrameElement,depth:number)=>{if(depth>5||!isVisible(child))return;try{const doc=child.contentDocument;if(!doc||doc.defaultView?.location.origin!==host.location.origin)return;found.push(doc);doc.querySelectorAll('iframe').forEach(f=>visit(f,depth+1));}catch{/* An unrelated origin can never supply completion. */}};
    visit(frame,0);return found;
  };
  const enforce=()=>{
    if(!active||!player||redirecting)return;
    const controller=player.view().playbackController(),target=currentSlide();if(target<1)return;
    if(target>policy.slideCount){options.adapterReady(false);options.status('This presentation needs its current progression map. Please contact APGI.');controller.pause();return;}
    const blocked=firstBlockedSlide(policy,state,target);
    if(blocked!==null){
      redirecting=true;frame.style.visibility='hidden';controller.pause();
      controller.gotoSlide(blocked-1,false);redirecting=false;
      if(currentSlide()===blocked)frame.style.visibility='';
      options.status(missingTigerRequirement(policy,state));
    }else frame.style.visibility='';
  };
  const connector:Connector={register(candidate){
    if(!active)return;
    try{if(candidate.view().displayObject().ownerDocument!==frame.contentDocument)return;}catch{return;}
    if(candidate.presentation().slides().count()!==policy.slideCount){options.adapterReady(false);options.status('This course package does not match its progression map. Please contact APGI.');candidate.view().playbackController().pause();return;}
    releasePlayer?.();player=candidate;
    const event=candidate.view().playbackController().slideChangeEvent();event.addHandler(enforce);
    releasePlayer=()=>event.removeHandler(enforce);options.adapterReady(true);enforce();
  }};
  connectorHost.ispringPresentationConnector=connector;
  const tick=()=>{
    if(!active||!player)return;
    enforce();const slide=currentSlide();
    if(slide===policy.videoSlide){
      for(const doc of documents()) for(const video of doc.querySelectorAll('video')){
        if(observedVideos.has(video)||!isVisible(video)||!Number.isFinite(video.duration)||Math.abs(video.duration-policy.duration)>0.5)continue;
        observedVideos.add(video);
        let position=video.currentTime,clock=host.performance.now();
        const reset=()=>{position=video.currentTime;clock=host.performance.now();};
        const watch=()=>{
          const now=host.performance.now(),next=video.currentTime,elapsed=(now-clock)/1000,delta=next-position;
          if(active&&currentSlide()===policy.videoSlide&&host.document.visibilityState==='visible'&&!video.paused&&!video.seeking&&delta>0&&delta<=elapsed*Math.min(4,video.playbackRate)+0.3){
            ranges=mergeWatchedRanges([...ranges,[position,Math.min(next,policy.duration)]],policy.duration);
            if(Date.now()-lastSent>=5000&&!pending){lastSent=Date.now();void flush().catch(()=>{});}
          }
          position=next;clock=now;
        };
        video.addEventListener('timeupdate',watch);video.addEventListener('seeking',reset);video.addEventListener('seeked',reset);video.addEventListener('playing',reset);video.addEventListener('pause',reset);
        const paused=()=>{if(active)void flush().catch(()=>{});};video.addEventListener('pause',paused);video.addEventListener('ended',paused);
        cleanup.push(()=>{video.removeEventListener('timeupdate',watch);for(const name of ['seeking','seeked','playing','pause'])video.removeEventListener(name,reset);video.removeEventListener('pause',paused);video.removeEventListener('ended',paused);});
      }
    }
    const activity=policy.activities.find(a=>a.slide===slide);if(!activity)return;
    const key=activityKey(activity);if(state.summaries.includes(key)||summaryPending.has(key))return;
    const inspectSummary=(doc:Document)=>{
      if(!active||currentSlide()!==activity.slide||state.summaries.includes(key)||summaryPending.has(key))return;
      const identifier=doc.body?.textContent?.match(/TK-LU\d{2}-(?:LA|F)\d{2}/)?.[0];
      const modal=doc.getElementById('summary-modal');
      if(identifier!==activity.id||!modal||modal.hidden||modal.getAttribute('aria-hidden')==='true'||!isVisible(modal))return;
      summaryPending.add(key);void send({summary:key}).catch(()=>{}).finally(()=>{host.setTimeout(()=>summaryPending.delete(key),5000);});
    };
    for(const doc of documents()){
      const modal=doc.getElementById('summary-modal');
      if(modal&&observedSummaries.get(doc)!==activity.slide){
        const observer=new MutationObserver(()=>inspectSummary(doc));observer.observe(modal,{attributes:true,attributeFilter:['hidden','class','style','aria-hidden']});
        observedSummaries.set(doc,activity.slide);cleanup.push(()=>observer.disconnect());
      }
      inspectSummary(doc);
    }
  };
  const timer=host.setInterval(tick,250);cleanup.push(()=>host.clearInterval(timer));
  return {
    flush,
    update(saved:TigerProgress){state=saved;ranges=mergeWatchedRanges([...ranges,...saved.video_ranges],policy.duration);enforce();},
    dispose(){active=false;releasePlayer?.();cleanup.forEach(fn=>fn());frame.style.visibility='';if(connectorHost.ispringPresentationConnector===connector){if(previous)connectorHost.ispringPresentationConnector=previous;else delete connectorHost.ispringPresentationConnector;}}
  };
}
