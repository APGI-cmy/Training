/* Learner narration preferences are separate from progress and assessment state. */
(function(w){'use strict';
const library=w.LU1_NARRATOR_LIBRARY;if(!library?.voices?.length)return;
const base=new URL('.',document.currentScript?.src||document.querySelector('script[src$="narrator-choice.js"]')?.src||location.href),preference='ea-course:narrator:v1';
const $=id=>document.getElementById(id),clean=s=>String(s||'').replace(/\s+/g,' ').trim();
function key(s){let h=2166136261;for(const c of clean(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return 'scene-'+(h>>>0).toString(16);}
let selected=library.defaultVoice,lastOpener,dialog;const videos=new Map();
try{const saved=localStorage.getItem(preference);if(library.voices.some(v=>v.id===saved))selected=saved;}catch{}
const url=p=>new URL(p,base).href,profile=()=>library.voices.find(v=>v.id===selected);
function resolve(text){const id=key(text),entry=library.clips[selected]?.[id];if(!entry||clean(library.texts[id])!==clean(text))return null;return {...entry,text:library.texts[id],voice:selected,src:url(entry.src),captions:entry.captions?url(entry.captions):undefined};}
function pauseAll(){for(const m of document.querySelectorAll('audio,video'))try{m.pause();}catch{}w.speechSynthesis?.cancel();}
function label(){return profile().name+' · '+profile().accent;}
function positionIn(segments,t){let i=segments.findIndex(s=>t>=s.start&&t<s.end);if(i<0)i=t>=segments.at(-1).end?segments.length-1:0;const s=segments[i];return{i,fraction:Math.min(1,Math.max(0,(t-s.start)/(s.end-s.start)))};}
function bindVideo(video,original,id,onVariant){
 if(!videos.has(video)){videos.set(video,{original,id,onVariant,current:original});}
 const item=videos.get(video),variant=library.videos[selected]?.[id];if(!variant)return;
 const oldSegments=item.current.segments||item.current.chapters,oldTime=Number(video.currentTime)||0;
 const place=oldSegments?.length?positionIn(oldSegments,oldTime):null;
 const targetSegments=variant.segments||variant.chapters;
 const targetTime=place&&targetSegments[place.i]?targetSegments[place.i].start+place.fraction*(targetSegments[place.i].end-targetSegments[place.i].start):0;
 item.current={...original,...variant};item.onVariant?.(item.current);
 video.pause();video.src=url(variant.src);video.dataset.narratorVoice=selected;video.dataset.narratorVideo=id;
 const track=video.querySelector('track');if(track)track.src=url(variant.captions);
 if(targetTime>0)video.addEventListener('loadedmetadata',()=>{video.currentTime=Math.min(targetTime,Math.max(0,video.duration-.05));},{once:true});
}
function update(){
 for(const select of document.querySelectorAll('[data-narrator-select]'))select.value=selected;
 if($('voice-label'))$('voice-label').textContent=label();
 if($('narrator-choice-status'))$('narrator-choice-status').textContent='Your narrator is '+label()+'. Your choice is saved in this browser. Your learning and assessment records stay unchanged.';
 if(dialog)for(const card of dialog.querySelectorAll('[data-voice]')){const active=card.dataset.voice===selected;card.classList.toggle('selected',active);const b=card.querySelector('[data-choose]');b.setAttribute('aria-pressed',String(active));b.textContent=active?'Selected narrator':'Choose '+card.dataset.name;}
}
function choose(id){
 if(!library.voices.some(v=>v.id===id))throw Error('Unavailable narrator');
 pauseAll();selected=id;let saved=true;try{localStorage.setItem(preference,id);}catch{saved=false;}
 // Never write LU state, SCORM suspend_data, quiz answers or attempt counters.
 for(const [video,item]of videos){if(!video.isConnected){videos.delete(video);continue;}bindVideo(video,item.original,item.id,item.onVariant);}
 for(const audio of document.querySelectorAll('audio'))if(!audio.closest('#narrator-choice-dialog'))audio.removeAttribute('src');
 update();if($('audio-status'))$('audio-status').textContent=profile().name+' selected. Select Replay this scene to listen.';
 if(!saved&&$('narrator-choice-status'))$('narrator-choice-status').textContent='Your narrator is '+profile().name+'. This browser could not save your preference; your current selection still works.';
 document.dispatchEvent(new CustomEvent('lu1-narrator-change',{detail:{voice:id,name:profile().name}}));
}
function E(tag,text,parent,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;parent?.append(n);return n;}
function open(){
 lastOpener=document.activeElement;
 if(!dialog){dialog=E('dialog',undefined,document.body,'narrator-dialog');dialog.id='narrator-choice-dialog';dialog.setAttribute('aria-labelledby','narrator-choice-title');const head=E('header',undefined,dialog);E('h2','Choose your narrator',head).id='narrator-choice-title';const close=E('button','Close',head);close.type='button';close.onclick=()=>dialog.close();
 E('p','Each voice reads the same sample. Choose the voice you find easiest to follow. You can change it at any time.',dialog);
 const grid=E('div',undefined,dialog,'narrator-grid');
 for(const voice of library.voices){const card=E('article',undefined,grid,'narrator-card');card.dataset.voice=voice.id;card.dataset.name=voice.name;E('h3',voice.name,card);E('p',voice.accent+' · '+voice.kind,card);const a=E('audio',undefined,card);a.controls=true;a.preload='none';a.src=url(voice.sample);a.setAttribute('aria-label','Listen to '+voice.name+' sample');const b=E('button','Choose '+voice.name,card);b.type='button';b.dataset.choose='true';b.onclick=()=>choose(voice.id);}
 const text=E('details',undefined,dialog);E('summary','Read the sample',text);E('p',library.sampleText,text);
 E('p','Your choice is saved in this browser. It does not change your answers, scores or available attempts.',dialog).id='narrator-choice-status';
 dialog.addEventListener('close',()=>{for(const a of dialog.querySelectorAll('audio'))a.pause();lastOpener?.focus();});}
 pauseAll();update();dialog.showModal();dialog.querySelector('button').focus();
}
function mount(){
 const actions=document.querySelector('.top-actions')||document.querySelector('body>header');if(!actions)return;
 const b=E('button','Narrator voices',actions,'narrator-open');b.type='button';b.id='narrator-voices';b.onclick=open;
 const audioActions=document.querySelector('.audio-actions');if(audioActions){const l=E('label','Narrator ',audioActions,'narrator-inline-label'),select=E('select',undefined,l);select.dataset.narratorSelect='true';select.id='narrator-select';for(const v of library.voices){const o=E('option',v.name+' · '+v.kind,select);o.value=v.id;}select.onchange=()=>choose(select.value);}
 update();
}
w.addEventListener('storage',e=>{if(e.key===preference&&e.newValue!==selected&&library.voices.some(v=>v.id===e.newValue))choose(e.newValue);});
document.addEventListener('play',e=>{if(e.target instanceof HTMLMediaElement)for(const m of document.querySelectorAll('audio,video'))if(m!==e.target)m.pause();},true);
w.LU1Narrator={resolve,choose,open,label,profile,selected:()=>selected,bindVideo,intro:original=>({...original,...library.videos[selected]?.INTRO}),library};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})(window);
