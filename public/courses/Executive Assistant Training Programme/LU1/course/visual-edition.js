/* Text-led teaching assets: explicit placements, never a generic fallback. */
(function(w){'use strict';
const catalog=w.LU1_LEARNING_IMAGES.images,D=w.LU1_DATA,plan=w.LU1_MESSAGE_PLACEMENTS;
const deputy='A deputy is an agreed stand-in who carries out specified duties for someone else during an agreed period. In this case, Aisha may cover Daniel’s work only after she has accepted the particular duties and dates and has the information and access she needs. Being named as deputy does not give her all of Daniel’s responsibilities or unlimited decision authority. Any limits and unresolved arrangements must remain clear.';
D.glossary.push({term:'Deputy',meaning:deputy});
const old=w.LU1Revision.afterMount;
let observer,activity=1,opener,dialog;
const E=(tag,text,p,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;p?.append(n);return n;};
function close(){dialog?.close();opener?.focus();}
function enlarge(img,trigger){opener=trigger||img;
 if(!dialog){dialog=E('dialog',undefined,document.body,'image-lightbox');dialog.id='image-lightbox';dialog.setAttribute('aria-label','Enlarged teaching image');const h=E('header',undefined,dialog);E('span','Select the image again to return to the lesson.',h);const b=E('button','Close image',h);b.type='button';b.onclick=close;const full=E('img',undefined,dialog);full.onclick=close;full.tabIndex=0;full.setAttribute('role','button');full.setAttribute('aria-label','Reduce image and return to the lesson');full.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();close();}};dialog.addEventListener('click',e=>{if(e.target===dialog)close();});dialog.addEventListener('close',()=>opener?.focus());}
 const full=dialog.querySelector('img');full.src=img.src;full.alt=img.alt;dialog.showModal();dialog.querySelector('button').focus();
}
function photo(parent,id,position='prepend'){
 const item=catalog[id];if(!item)return;const current=parent.querySelector(':scope>.teaching-photo');if(current?.dataset.imageId===id)return;current?.remove();
 const f=E('figure',undefined,null,'teaching-photo');f.dataset.imageId=id;const b=E('button',undefined,f,'photo-enlarge');b.type='button';b.setAttribute('aria-label','Enlarge image: '+item.alt);b.title='Select to enlarge; select the enlarged image again to reduce it.';
 const img=E('img',undefined,b);img.src=item.src;img.alt=item.alt;img.loading='lazy';img.decoding='async';img.width=1536;img.height=1024;b.onclick=()=>enlarge(img,b);E('figcaption','Select image to enlarge · fictional teaching illustration',f);
 position==='append'?parent.append(f):parent.prepend(f);parent.classList.add('has-teaching-photo');
}
const roles=plan.roles;
function update(root){
 for(const img of root.querySelectorAll('img:not(.photo-enlarge img)')){if(img.closest('button,a'))continue;img.tabIndex=0;img.setAttribute('role','button');img.title='Select to enlarge; select again to reduce';img.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();enlarge(img,img);}};}
 for(const panel of root.querySelectorAll('.system-interaction>.scene-panel')){
  const buttons=[...root.querySelectorAll('.system-choices button')],chosen=buttons.findIndex(b=>b.classList.contains('active'));
  if(chosen>=0&&roles[chosen])photo(panel,roles[chosen]);
  else {panel.querySelector(':scope>.teaching-photo')?.remove();panel.classList.remove('has-teaching-photo');}
 }
 // Each selected worked field has an explicit message-specific photograph.
 for(const worked of Object.values(w.LU1_OWNER_REVIEW_DATA?.workedImages||{})){
  if(worked.activity!==activity)continue;
  const panel=root.querySelector('#'+worked.anchor+' .worked-explorer .scene-panel');
  if(!panel)continue;
  const placement=worked.fields.find(f=>f.field===panel.dataset.workedField);
  if(placement)photo(panel,placement.image);
 }
}
w.LU1Revision.afterMount=function(a,root,api){observer?.disconnect();activity=a.number;old(a,root,api);
 document.title='LU1 company-neutral review · 28 October 2026';
 if(w.LU1_REVIEW_MODE)document.querySelector('.test-ribbon').textContent='LU1 OWNER REVIEW 0.15 · 28 OCTOBER 2026 · NOT RELEASED';
 const placement=plan.placements.find(x=>x.activity===activity);
 if(placement&&!(placement.gate&&root.querySelector('.lock'))){
  const scene=root.querySelector('#'+placement.anchor);
  if(scene){photo(scene,placement.image,'append');scene.dataset.imageReason=placement.reason;
   if(placement.anchor!=='scene')scene.querySelector('h2')?.after(scene.querySelector(':scope>.teaching-photo'));
  }
 }
 update(root);
 observer=new MutationObserver(records=>{if(records.every(r=>r.target.closest?.('.teaching-photo')))return;observer.disconnect();update(root);observer.observe(root,{childList:true,subtree:true});});observer.observe(root,{childList:true,subtree:true});
};
document.addEventListener('click',ev=>{const img=ev.target.closest('#activity img');if(img&&!img.closest('.photo-enlarge')){if(img.closest('button')||img.closest('a'))return;enlarge(img,img);}});
// Existing meaningful diagrams also enlarge with keyboard access.
document.addEventListener('lu1-scene-change',()=>{for(const img of document.querySelectorAll('#activity img:not(.photo-enlarge img)')){img.tabIndex=0;img.setAttribute('role','button');img.title='Select to enlarge; select again to reduce';img.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();enlarge(img,img);}};}});
w.LU1Visuals={enlarge,close,deputy,update,placements:plan.placements};
})(window);
