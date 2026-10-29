/* Page-turning reader for the NKS Capital book edition. No external services. */
(function(w){'use strict';
const book=w.LU1_BOOK,$=id=>document.getElementById(id),storeKey='ea-lu1-nks-book-reader-08';
if(!book||!Array.isArray(book.pages)||!book.pages.length){$('book-loading').textContent='The book pages could not be loaded. Open the accessible text view from the reading formats menu.';return;}
const E=(tag,text,parent,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;parent?.append(n);return n;},B=(label,fn,parent)=>{const b=E('button',label,parent);b.type='button';b.onclick=fn;return b;};
let prefs={};try{prefs=JSON.parse(localStorage.getItem(storeKey)||'{}');if(!prefs||typeof prefs!=='object'||Array.isArray(prefs))prefs={};}catch{}
let page=Math.max(1,Math.min(book.pages.length,Number(prefs.page)||1)),zoom=1,wantSpread=prefs.spread!==false,query='',results=[],bookmarks=new Set((Array.isArray(prefs.bookmarks)?prefs.bookmarks:[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=book.pages.length)),thumbsBuilt=false;
const total=book.pages.length,stage=$('book-stage'),spread=$('book-spread');
function status(s){$('reader-status').textContent=s;}
function save(){prefs={page,spread:wantSpread,bookmarks:[...bookmarks].sort((a,b)=>a-b)};try{localStorage.setItem(storeKey,JSON.stringify(prefs));}catch{status('Reading position could not be saved on this device.');}}
function pair(n=page){if(!wantSpread||w.innerWidth<1050||stage.clientWidth<650||n===1)return[n];const first=n%2===0?n:n-1;return[first,...(first<total?[first+1]:[])];}
function label(n){const section=[...(book.contents||[])].reverse().find(x=>x.page<=n);return section?.title||'The executive partnership';}
function openPage(n,direction=0){n=Number(n);if(!Number.isFinite(n)){status('Enter a page number.');return;}page=Math.max(1,Math.min(total,Math.round(n)));render(direction);save();const h='#page='+page;if(location.hash!==h)history.replaceState(null,'',h);}
function next(){const p=pair();if(p.at(-1)<total)openPage(p.at(-1)+1,1);}
function previous(){const p=pair();if(p[0]>1)openPage(p[0]===2?1:Math.max(1,p[0]-p.length),-1);}
function makePage(n,which,direction){
 const p=book.pages[n-1],article=E('article',undefined,spread,'book-page '+(which===0?'left-page':'right-page'));article.dataset.page=n;article.setAttribute('role','group');article.setAttribute('aria-label','Page '+n+' of '+total+' — '+label(n));
 if(direction&&((direction>0&&which===pair().length-1)||(direction<0&&which===0)))article.classList.add(direction>0?'turn-next':'turn-previous');
 const img=E('img',undefined,article);img.src=p.image;img.alt='';img.setAttribute('aria-hidden','true');img.draggable=false;img.decoding='async';
 img.onerror=()=>status('Page '+n+' could not load. The accessible text view remains available.');
 const layer=E('div',undefined,article,'text-layer');layer.setAttribute('aria-hidden','true');
 for(const word of p.words||[]){const s=E('span',word.t+' ',layer);s.style.left=(word.x/p.width*100)+'%';s.style.top=(word.y/p.height*100)+'%';s.style.width=(word.w/p.width*100)+'%';s.style.height=(word.h/p.height*100)+'%';s.dataset.word=word.t.toLocaleLowerCase();}
 const text=E('div',p.text,article,'sr-only');text.setAttribute('aria-label','Page '+n+' text');
 article.addEventListener('click',ev=>{if(ev.target.closest('button'))return;if(page!==n){page=n;syncControls();save();}});
 if(which===0&&pair()[0]>1){const corner=B('',previous,article);corner.className='page-corner previous';corner.setAttribute('aria-label','Turn to previous pages');}
 if(which===pair().length-1&&pair().at(-1)<total){const corner=B('',next,article);corner.className='page-corner';corner.setAttribute('aria-label','Turn to next pages');}
 return article;
}
function dimensions(){const visible=[...spread.children];if(!visible.length)return;const p=book.pages[visible[0].dataset.page-1],gutter=visible.length>1?0:0,availableW=Math.max(150,stage.clientWidth-60),availableH=Math.max(180,stage.clientHeight-44);let base=Math.min(availableW/(p.width*visible.length+gutter),availableH/p.height);if(!Number.isFinite(base)||base<=0)base=.6;
 visible.forEach((node)=>{const item=book.pages[node.dataset.page-1];const scale=base*zoom;node.style.width=(item.width*scale)+'px';node.style.height=(item.height*scale)+'px';node.querySelectorAll('.text-layer span').forEach((s,i)=>{const word=item.words[i];s.style.fontSize=(word.h*scale*.92)+'px';});});
 $('zoom-label').textContent=Math.round(zoom*100)+'%';
}
function render(direction=0){spread.replaceChildren();const ps=pair();spread.classList.toggle('single',ps.length===1);ps.forEach((n,i)=>makePage(n,i,direction));$('book-loading').hidden=true;dimensions();highlight();syncControls();
 const following=book.pages[ps.at(-1)];if(following){const image=new Image();image.src=following.image;}
}
function syncControls(){const ps=pair();$('page-number').value=page;$('page-number').max=total;$('page-total').textContent='/ '+total;$('previous-page').disabled=ps[0]===1;$('next-page').disabled=ps.at(-1)===total;$('reading-location').textContent=(ps.length===2?'Pages '+ps.join('–'):'Page '+page)+' · '+label(page);$('bookmark-page').setAttribute('aria-pressed',String(bookmarks.has(page)));$('bookmark-page').firstChild.textContent=bookmarks.has(page)?'★ ':'☆ ';$('toggle-spread').setAttribute('aria-pressed',String(wantSpread));$('toggle-spread').querySelector('span').textContent=wantSpread?'Two pages':'One page';$('zoom-in').disabled=zoom>=2.5;$('zoom-out').disabled=zoom<=.6;
 const current=[...(book.contents||[])].reverse().find(x=>x.page<=page)?.id;
 for(const b of $('contents-list').querySelectorAll('button')){if(b.dataset.section===current)b.setAttribute('aria-current','location');else b.removeAttribute('aria-current');}
 for(const b of $('thumbnail-strip').querySelectorAll('button')){if(Number(b.dataset.page)===page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}
}
function highlight(){if(!query)return;const tokens=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);for(const node of spread.children){const p=book.pages[node.dataset.page-1],layer=node.querySelector('.text-layer');for(const word of p.words||[]){if(!tokens.some(t=>word.t.toLocaleLowerCase().includes(t)))continue;const mark=E('mark','',layer);mark.style.left=word.x/p.width*100+'%';mark.style.top=word.y/p.height*100+'%';mark.style.width=word.w/p.width*100+'%';mark.style.height=word.h/p.height*100+'%';}}}
function search(text){query=String(text||'').trim().replace(/\s+/g,' ');$('search-results').replaceChildren();results=[];if(!query){$('search-count').textContent='';render();return;}
 const term=query.toLocaleLowerCase();for(const p of book.pages){const source=(p.text||'').replace(/\s+/g,' '),at=source.toLocaleLowerCase().indexOf(term);if(at<0)continue;results.push(p.n);const excerpt=source.slice(Math.max(0,at-32),Math.min(source.length,at+100)).replace(/\s+/g,' ');B('Page '+p.n+' · '+excerpt,()=>{openPage(p.n);if(w.innerWidth<=740)toggleSidebar(false);},$('search-results'));}
 $('search-count').textContent=results.length?(results.length+' page'+(results.length===1?'':'s')+' found.'):'No matching pages. Try a shorter word or phrase.';render();if(results.length)openPage(results[0]);
}
function renderBookmarks(){$('bookmark-list').replaceChildren();if(!bookmarks.size){E('p','Use Bookmark above the pages to save a reading place.', $('bookmark-list'));return;}[...bookmarks].sort((a,b)=>a-b).forEach(n=>{const row=E('div',undefined,$('bookmark-list'),'saved-mark');B('Page '+n+' · '+label(n),()=>{openPage(n);if(w.innerWidth<=740)toggleSidebar(false);},row);const remove=B('×',()=>{bookmarks.delete(n);save();renderBookmarks();syncControls();},row);remove.setAttribute('aria-label','Remove bookmark for page '+n);});}
function tab(which){for(const name of ['contents','marks']){$(name+'-tab').setAttribute('aria-selected',String(name===which));$(name+'-panel').hidden=name!==which;}if(which==='marks')renderBookmarks();}
function toggleSidebar(open){const show=open===undefined?document.body.classList.contains('sidebar-closed'):open;document.body.classList.toggle('sidebar-closed',!show);$('toggle-contents').setAttribute('aria-expanded',String(show));render();}
for(const row of book.contents||[]){const b=B('',()=>{openPage(row.page);if(w.innerWidth<=740)toggleSidebar(false);},$('contents-list'));b.dataset.section=row.id;E('span',row.title,b);E('span',String(row.page),b,'toc-page');}
$('contents-tab').onclick=()=>tab('contents');$('marks-tab').onclick=()=>tab('marks');
document.querySelector('.wordmark').onclick=e=>{e.preventDefault();openPage(1);};
$('previous-page').onclick=previous;$('next-page').onclick=next;$('page-number').onchange=()=>openPage($('page-number').value);
$('page-number').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();openPage($('page-number').value);stage.focus();}};
$('zoom-in').onclick=()=>{zoom=Math.min(2.5,Math.round((zoom+.2)*10)/10);dimensions();syncControls();};
$('zoom-out').onclick=()=>{zoom=Math.max(.6,Math.round((zoom-.2)*10)/10);dimensions();syncControls();};
$('fit-pages').onclick=()=>{zoom=1;render();stage.scrollTop=0;stage.scrollLeft=0;};
$('toggle-spread').onclick=()=>{wantSpread=!wantSpread;zoom=1;render();save();};
$('toggle-contents').onclick=()=>toggleSidebar();
$('bookmark-page').onclick=()=>{if(bookmarks.has(page)){bookmarks.delete(page);status('Bookmark removed.');}else{bookmarks.add(page);status('Page '+page+' bookmarked.');}save();syncControls();renderBookmarks();};
$('search-form').onsubmit=e=>{e.preventDefault();search($('book-search').value);};$('book-search').onsearch=()=>search($('book-search').value);
$('show-thumbnails').onclick=()=>{const panel=$('thumbnail-strip');panel.hidden=!panel.hidden;$('show-thumbnails').setAttribute('aria-expanded',String(!panel.hidden));if(!thumbsBuilt){for(const p of book.pages){const b=B('',()=>openPage(p.n),panel);b.dataset.page=p.n;b.setAttribute('aria-label','Open page '+p.n);const img=E('img',undefined,b);img.src=p.thumb;img.alt='';img.loading='lazy';E('span',String(p.n),b);}thumbsBuilt=true;}render();};
$('show-options').onclick=()=>{const open=$('book-options').hidden;$('book-options').hidden=!open;$('show-options').setAttribute('aria-expanded',String(open));};
$('pdf-copy').href=book.pdf;$('pdf-copy').target='_blank';$('pdf-copy').rel='noopener';$('pdf-copy').setAttribute('download','');
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{status('Full screen is unavailable here. Open the book in its own tab for more reading space.');}};
document.addEventListener('fullscreenchange',()=>{render();$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'Exit full screen':'Full screen');});
document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest?.('input,textarea,select'))return;if(e.key==='ArrowRight'){e.preventDefault();next();}else if(e.key==='ArrowLeft'){e.preventDefault();previous();}else if(e.key==='Home'){e.preventDefault();openPage(1);}else if(e.key==='End'){e.preventDefault();openPage(total);}else if(e.key==='Escape'&&!$('book-options').hidden){$('book-options').hidden=true;$('show-options').setAttribute('aria-expanded','false');$('show-options').focus();}});
w.addEventListener('resize',()=>render());
function fromHash(){const raw=location.hash.slice(1),match=raw.match(/^page=(\d+)$/);if(match)return Math.max(1,Math.min(total,Number(match[1])));return (book.contents||[]).find(x=>x.id===raw)?.page;}
w.addEventListener('hashchange',()=>{const n=fromHash();if(n)openPage(n);});
const requested=Number(new URLSearchParams(location.search).get('page'))||fromHash();if(requested)page=Math.max(1,Math.min(total,Math.round(requested)));
for(const [i,id] of ['contents-tab','marks-tab'].entries())$(id).addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();e.stopPropagation();const name=i===0?'marks':'contents';tab(name);$(name+'-tab').focus();});
if(w.innerWidth<=740)toggleSidebar(false);else render();
// A detached reference book returns focus to its original learning window.
const returnLink=document.querySelector('.return-link');
if(returnLink){const params=new URLSearchParams(location.search),back=new URL('index.html',location.href);const a=params.get('returnActivity'),scene=params.get('returnScene');if(a)back.searchParams.set('activity',a);if(scene)back.searchParams.set('focus',scene);if(params.get('review')==='1')back.searchParams.set('review','1');returnLink.href=back.href;returnLink.textContent='Return to learning window';returnLink.onclick=e=>{try{if(w.opener&&!w.opener.closed&&w.opener.location.origin===location.origin){e.preventDefault();w.opener.focus();}}catch{}};}
save();
w.LU1BookReader={openPage,next,previous,search,render,bookmark:()=>bookmarks.has(page),state:()=>({page,visible:pair(),zoom,wantSpread,bookmarks:[...bookmarks],results:[...results]})};
})(window);
