/* Single-video orientation. No course navigation, assessment score or pass claim. */
(function () {
 'use strict';
 const video=document.getElementById('welcome-video');
 const status=document.getElementById('learning-status');
 const retry=document.getElementById('retry-save');
 const endCard=document.getElementById('end-card');
 // Fit the platform's presentation frame and supply its read-only review reference.
 if(window.parent!==window){
  document.documentElement.classList.add('embedded');
  try{
   const connector=window.parent.ispringPresentationConnector;
   if(connector&&typeof connector.register==='function'){
    const handlers=new Set();
    const change={addHandler:fn=>handlers.add(fn),removeHandler:fn=>handlers.delete(fn)};
    connector.register({view:()=>({displayObject:()=>video,playbackController:()=>({currentSlideIndex:()=>0,slideChangeEvent:()=>change})}),presentation:()=>({slides:()=>({getSlide:()=>({title:()=>{const seconds=Math.floor(video.currentTime||0);return 'Welcome and course orientation · '+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}})})})});
    video.addEventListener('timeupdate',()=>{for(const changed of handlers)changed();});
   }
  }catch{/* Cross-origin LMS frames keep their own review and navigation controls. */}
 }
 const query=new URLSearchParams(location.search);
 const explicitPreview=query.get('review')==='1'||query.get('preview')==='1';
 let api=null,edition=null,initialized=false,readonly=explicitPreview,finished=false;
 let hasPlayed=false,complete=false,startedAt=0,activeAt=0,activeSeconds=0;
 let lastTime=0,watching=false,restoredLocation=0,lastCommit=0,saveFailed=false;
 const watched=new Set();
 const fields={status:'cmi.completion_status',location:'cmi.location',time:'cmi.session_time',exit:'cmi.exit'};
 function find(win){
  for(let tries=0;win&&tries<16;tries++){
   try{
    if(win.API_1484_11)return {api:win.API_1484_11,edition:'2004'};
    if(win.API)return {api:win.API,edition:'1.2'};
    if(win.parent===win)break;win=win.parent;
   }catch{break;}
  }
  return null;
 }
 function message(s){status.textContent=s;}
 function get(k){try{return String(edition==='2004'?api.GetValue(k):api.LMSGetValue(k));}catch{return '';}}
 function write(k,v){
  if(!initialized||readonly||finished)return false;
  try{return String(edition==='2004'?api.SetValue(k,String(v)):api.LMSSetValue(k,String(v)))==='true';}catch{return false;}
 }
 function isTrue(v){return String(v)==='true';}
 function problem(){saveFailed=true;retry.hidden=false;message('Your progress could not be saved. Keep this page open and try Save progress again, or contact support.');}
 function commit(){
  try{if(!isTrue(edition==='2004'?api.Commit(''):api.LMSCommit(''))){problem();return false;}}
  catch{problem();return false;}
  saveFailed=false;retry.hidden=true;lastCommit=Date.now();return true;
 }
 function coverage(){
  if(!Number.isFinite(video.duration)||video.duration<=0)return 0;
  return Math.min(1,watched.size/Math.ceil(video.duration*2));
 }
 function sessionTime(){
  const secs=activeSeconds+(activeAt?(Date.now()-activeAt)/1000:0);
  if(edition==='2004')return 'PT'+secs.toFixed(2)+'S';
  const hundredths=Math.round(secs*100);return String(Math.floor(hundredths/360000)).padStart(4,'0')+':'+String(Math.floor(hundredths/6000)%60).padStart(2,'0')+':'+String(Math.floor(hundredths/100)%60).padStart(2,'0')+'.'+String(hundredths%100).padStart(2,'0');
 }
 function save(){
  if(!initialized||readonly||finished||!hasPlayed)return false;
  let ok=write(fields.location,video.currentTime.toFixed(2));
  ok=write('cmi.suspend_data',JSON.stringify({v:1,watched:[...watched].sort((a,b)=>a-b),complete}))&&ok;
  ok=write(fields.time,sessionTime())&&ok;
  ok=write(fields.exit,complete?(edition==='2004'?'normal':''):'suspend')&&ok;
  ok=write(fields.status,complete?'completed':'incomplete')&&ok;
  if(edition==='2004')ok=write('cmi.progress_measure',complete?'1':coverage().toFixed(4))&&ok;
  if(!ok){problem();return false;}
  return commit();
 }
 function stopClock(){if(activeAt){activeSeconds+=(Date.now()-activeAt)/1000;activeAt=0;}}
 if(!explicitPreview){
  let found=find(window);
  if(!found)try{if(window.opener)found=find(window.opener);}catch{}
  if(found){
   api=found.api;edition=found.edition;
   if(edition==='1.2')Object.assign(fields,{status:'cmi.core.lesson_status',location:'cmi.core.lesson_location',time:'cmi.core.session_time',exit:'cmi.core.exit'});
   try{initialized=isTrue(edition==='2004'?api.Initialize(''):api.LMSInitialize(''));}catch{}
   if(initialized){
    readonly=['browse','review'].includes(get(edition==='2004'?'cmi.mode':'cmi.core.lesson_mode'));
    complete=['completed','passed'].includes(get(fields.status));
    restoredLocation=Math.max(0,Number(get(fields.location))||0);
    try{const state=JSON.parse(get('cmi.suspend_data'));if(state.v===1&&Array.isArray(state.watched))for(const n of state.watched)if(Number.isInteger(n)&&n>=0&&n<10000)watched.add(n);}catch{}
   }else{readonly=true;message('The learning record could not be connected. You can preview the video; contact support before relying on saved progress.');}
  }else readonly=true;
 }
 if(!api||explicitPreview)message('Preview only. This video is not connected to a learner record.');
 else if(initialized)message(readonly?'Review mode. This view does not change your learner record.':complete?'Introduction previously viewed. You can watch it again.':'Ready when you are. Your viewing position saves as you watch.');
 video.addEventListener('loadedmetadata',()=>{
  if(Number.isFinite(video.duration)){
   for(const n of watched)if(n>=Math.ceil(video.duration*2))watched.delete(n);
   if(restoredLocation>0&&restoredLocation<video.duration-.5&&!complete)video.currentTime=restoredLocation;
  }
  if(video.textTracks&&video.textTracks[0])video.textTracks[0].mode='showing';
 });
 video.addEventListener('play',()=>{
  hasPlayed=true;startedAt=startedAt||Date.now();watching=true;lastTime=video.currentTime;
  if(!activeAt)activeAt=Date.now();
  if(initialized&&!readonly){if(!complete)write(fields.status,'incomplete');save();}
 });
 video.addEventListener('seeking',()=>{watching=false;});
 video.addEventListener('seeked',()=>{lastTime=video.currentTime;watching=!video.paused;});
 video.addEventListener('timeupdate',()=>{
  const now=video.currentTime,delta=now-lastTime;
  if(watching&&!video.seeking&&delta>0&&delta<2.5){
   for(let n=Math.floor(lastTime*2);n<Math.ceil(now*2);n++)watched.add(n);
  }
  lastTime=now;
  if(hasPlayed&&Date.now()-lastCommit>15000&&!readonly)save();
 });
 video.addEventListener('pause',()=>{watching=false;stopClock();if(hasPlayed&&!readonly)save();});
 video.addEventListener('ended',()=>{
  watching=false;stopClock();endCard.hidden=false;
  if(coverage()>=.95){complete=true;if(!readonly&&initialized){if(save())message('Introduction viewed. Continue using the platform when you are ready.');}else message('Video finished. Use the platform navigation when you are ready.');}
  else if(complete)message('Introduction previously viewed. Use the platform navigation when you are ready.');
  else message('The video has finished. Some sections were skipped; replay them to record the full introduction as viewed.');
  /* Deliberately no redirect, sequencing request, window close or Next control. */
 });
 video.addEventListener('error',()=>message('The video could not be loaded. Keep this page open and contact support.'));
 retry.addEventListener('click',()=>{if(save())message(complete?'Introduction viewed. Progress saved.':'Your viewing position has been saved.');});
 function finish(){
  if(finished)return;stopClock();if(initialized){if(!readonly&&hasPlayed)save();try{edition==='2004'?api.Terminate(''):api.LMSFinish('');}catch{}}finished=true;
 }
 window.addEventListener('pagehide',finish);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&hasPlayed&&!readonly)save();});
})();
