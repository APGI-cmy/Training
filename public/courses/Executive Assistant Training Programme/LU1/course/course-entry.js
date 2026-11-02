/* The standalone course welcome opens above, never inside, the LU scene route. */
(function(w){'use strict';
const key='course-welcome-completed-v2';let api,dialog,frame,started=false,opener;
function isOpen(){return !!dialog?.open;}
function stop(){api?.stop();w.LU1Scenes?.stop();for(const m of document.querySelectorAll('audio,video'))m.pause();}
function close(){if(!isOpen())return;api?.set(key,true);frame.src='about:blank';dialog.close();opener?.focus();document.getElementById('audio-status').textContent='You are back at your learning scene. Select Replay this scene when you are ready to listen.';const node=w.LU1Scenes?.getScenes()[w.LU1_CURRENT_SCENE?.scene||0];if(node&&!node.querySelector('video')&&document.getElementById('auto-audio').checked){const text=w.LU1Scenes.automaticText(node);if(text)w.LU1Scenes.playText(text,true);}}
function open(){
 stop();opener=document.activeElement;
 if(!dialog){dialog=document.createElement('dialog');dialog.id='course-welcome-dialog';dialog.setAttribute('aria-labelledby','course-welcome-title');const h=document.createElement('h2');h.id='course-welcome-title';h.textContent='Your course welcome';dialog.append(h);frame=document.createElement('iframe');frame.title='Standalone course overview and learning-space introduction';frame.allow='autoplay; fullscreen';dialog.append(frame);const b=document.createElement('button');b.type='button';b.textContent='Continue to my learning';b.onclick=close;dialog.append(b);document.body.append(dialog);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});}
 const url=new URL('../introduction/index.html',location.href);url.searchParams.set('embeddedWelcome','1');frame.src=url.href;dialog.showModal();
}
function bind(value){api=value;if(started)return;started=true;const link=document.getElementById('course-guide');if(link){link.removeAttribute('target');link.setAttribute('aria-haspopup','dialog');link.title='Open the separate course welcome. Your current learning scene stays saved.';}if(!api.get(key))open();}
w.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==frame?.contentWindow||!isOpen())return;if(e.data?.type==='lu1-welcome-continue')close();});
document.addEventListener('play',e=>{if(isOpen()&&e.target instanceof HTMLMediaElement)e.target.pause();},true);
document.addEventListener('click',e=>{if(e.target.closest('#course-guide')){e.preventDefault();open();}});
w.LU1Entry={bind,open,isOpen};
})(window);
