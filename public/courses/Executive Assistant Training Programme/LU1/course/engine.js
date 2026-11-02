/* Learning design tokens 0.3.0. Original palettes; not imported iSpring themes. */
(function(scope){'use strict';
 const themes={
  classic:{name:'Classic',family:'Office',primary:'#075e8b',accent:'#a94300',ink:'#173b50',tint:'#eaf4fb',line:'#5f8298'},
  teal:{name:'Calm Teal',family:'Harmony',primary:'#086565',accent:'#88401c',ink:'#173c3c',tint:'#e7f4f1',line:'#587f79'},
  forest:{name:'Evergreen',family:'Harmony',primary:'#265d3c',accent:'#844100',ink:'#203f2c',tint:'#edf5e9',line:'#607f67'},
  plum:{name:'Plum & Copper',family:'Geometric',primary:'#653b78',accent:'#953b28',ink:'#392b46',tint:'#f2ecf7',line:'#887298'},
  sand:{name:'Warm Sand',family:'Simplicity',primary:'#6d512b',accent:'#78421e',ink:'#463524',tint:'#f8f1e5',line:'#8b765c'},
  slate:{name:'Slate & Violet',family:'Office',primary:'#3c4d63',accent:'#67428a',ink:'#29384b',tint:'#edf1f7',line:'#6e8199'},
  navy:{name:'Navy & Gold',family:'Geometric',primary:'#143b60',accent:'#875000',ink:'#18334c',tint:'#edf2fa',line:'#66829e'},
  contrast:{name:'High Contrast',family:'Simplicity',primary:'#111111',accent:'#111111',ink:'#111111',tint:'#f2f2f2',line:'#111111'}
 };
 const skins={clean:'Clean / office',soft:'Soft / flowing',geometric:'Geometric / structured'};
 function validate(d){if(d===undefined)return [];if(!d||typeof d!=='object'||Array.isArray(d))return ['design must be an object.'];return [...(!themes[d.theme]?['Unknown design.theme.']:[]),...(!skins[d.skin]?['Unknown design.skin.']:[])];}
 function apply(root,design={theme:'classic',skin:'clean'}){const errors=validate(design);if(errors.length)throw Error(errors.join(' '));const t=themes[design.theme];root.dataset.theme=design.theme;root.dataset.skin=design.skin;Object.entries(t).filter(([k])=>!['name','family'].includes(k)).forEach(([k,v])=>root.style.setProperty('--apgi-'+k,v));root.style.setProperty('--apgi-canvas','#ffffff');root.style.setProperty('--apgi-on-accent','#ffffff');}
 function luminance(hex){const a=hex.match(/[0-9a-f]{2}/gi).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722;}
 function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
 scope.APGIDesign={version:'0.3.0',themes,skins,validate,apply,contrast};
})(typeof window==='undefined'?globalThis:window);

/* Shared learning interaction engine 0.3.0 | No network, dependencies or automatic storage. */
(function (scope) {
  'use strict';
  if(!scope.APGIDesign&&typeof require==='function')require('./themes.js');
  const VERSION='0.3.0';
  const MODELS=['tabs','accordion','sequence','branching','classification','comparison','single','multiple','matching','ordering','numeric','reflection','steps','timeline','process','cyclic-process','media-catalog','faq','glossary','labeled-graphic','hotspot','guided-image','circle-diagram','pyramid'];
  const isText=x=>typeof x==='string'&&x.trim().length>0;
  const safePath=x=>isText(x)&&/^assets\/[a-zA-Z0-9_./-]+$/.test(x)&&!x.split('/').some(s=>s==='..'||s==='.'||!s);
  function validateConfig(c){
    const errors=[],add=(ok,msg)=>{if(!ok)errors.push(msg);};
    if(!c||typeof c!=='object'||Array.isArray(c))return {ok:false,errors:['Configuration must be an object.']};
    add(c.schemaVersion===1,'schemaVersion must be 1.');add(c.engineVersion===VERSION,'engineVersion must be '+VERSION+'.');
    add(MODELS.includes(c.model),'Unknown model.');add(/^[a-z0-9][a-z0-9-]{2,79}$/.test(c.id||''),'id must be 3-80 lowercase letters, digits or hyphens.');
    ['title','outcome','context','instruction','summary'].forEach(k=>add(isText(c[k]),k+' must contain text.'));
    add(c.identity&&['organisation','course','unit','activity','edition'].every(k=>isText(c.identity[k])),'identity needs organisation, course, unit, activity and edition.');
    add(c.mode==='practice','Only mode practice is supported. Graded quizzes require a separate approved adapter.');
    scope.APGIDesign.validate(c.design).forEach(msg=>add(false,msg));
    add(Array.isArray(c.sources)&&c.sources.length>0&&c.sources.every(s=>s&&isText(s.title)&&isText(s.locator)&&['illustrative','verified','pending'].includes(s.status)),'sources need a title, locator and status (illustrative, verified or pending).');
    const d=c.content;
    if(!d||typeof d!=='object'||Array.isArray(d))return {ok:false,errors:[...errors,'content must be an object.']};
    const text=k=>add(isText(d[k]),'content.'+k+' must contain text.');
    const arr=(k,min=1)=>{add(Array.isArray(d[k])&&d[k].length>=min,'content.'+k+' needs at least '+min+' entries.');return Array.isArray(d[k])?d[k]:[];};
    const ids=(a,label)=>{add(a.every(x=>x&&isText(x.id))&&new Set(a.map(x=>x?.id)).size===a.length,label+' ids must be present and unique.');};
    const media=(m,label)=>{if(!m)return;add(['image','audio','video'].includes(m.kind),label+' kind must be image, audio or video.');add(safePath(m.src),label+' src must be a safe relative assets/ path.');if(m.kind==='image')add(isText(m.alt),label+' image needs meaningful alt text.');else {add(isText(m.transcript),label+' audio/video needs a transcript.');if(m.kind==='video')add(safePath(m.captions)&&/\.vtt$/i.test(m.captions),label+' video needs a captions .vtt asset.');}if(m.poster)add(safePath(m.poster),label+' poster path is invalid.');};
    media(d.media,'content.media');
    if(d.narration){media(d.narration,'content.narration');add(d.narration.kind==='audio'&&isText(d.narration.voice),'Narration must be audio with a course-approved voice label.');}
    const structural=['tabs','accordion','sequence','comparison','steps','timeline','process','cyclic-process','media-catalog','faq','glossary','labeled-graphic','hotspot','guided-image','circle-diagram','pyramid'];
    if(structural.includes(c.model)){
      const a=arr('items',2);ids(a,'items');a.forEach((x,i)=>{add(isText(x?.title)&&isText(x?.body),'items['+i+'] needs title and body.');media(x?.media,'items['+i+'].media');if(x?.narration){media(x.narration,'items['+i+'].narration');add(x.narration.kind==='audio'&&isText(x.narration.voice),'Item narration needs audio and a course-approved voice label.');}
        if(c.model==='timeline')add(isText(x?.date),'Timeline items need date labels.');
        if(['labeled-graphic','hotspot','guided-image'].includes(c.model))add(Number.isFinite(x?.x)&&x.x>=0&&x.x<=100&&Number.isFinite(x?.y)&&x.y>=0&&x.y<=100,'Image markers need x/y percentages from 0 to 100.');
      });
      if(['labeled-graphic','hotspot','guided-image'].includes(c.model)){add(d.media?.kind==='image','Image models require content.media.kind image.');}
      if(c.model==='comparison'){text('prompt');text('guidance');}
      if(c.model==='media-catalog')add(a.every(x=>x?.media),'Every catalog item needs media.');
    }
    if(['single','multiple'].includes(c.model)){
      text('prompt');const a=arr('options',2);ids(a,'options');add(a.every(x=>isText(x?.text)),'Options need text.');const keys=arr('correct');add(new Set(keys).size===keys.length&&keys.every(id=>a.some(o=>o.id===id)),'correct must contain unique option ids.');if(c.model==='single')add(keys.length===1,'Single response needs exactly one correct id.');text('correctFeedback');text('incorrectFeedback');
    }
    if(['classification','matching'].includes(c.model)){
      const a=arr('items',2),targets=arr('targets',2);ids(a,'items');ids(targets,'targets');add(targets.every(x=>isText(x?.title)),'Targets need title.');add(a.every(x=>isText(x?.text)&&targets.some(t=>t.id===x.target)),'Items need text and an existing target id.');text('correctFeedback');text('incorrectFeedback');
    }
    if(c.model==='ordering'){
      const a=arr('items',2);ids(a,'items');add(a.every(x=>isText(x?.text)),'Ordering items need text.');['initialOrder','correctOrder'].forEach(k=>{const p=arr(k,2);add(p.length===a.length&&new Set(p).size===p.length&&p.every(id=>a.some(x=>x.id===id)),k+' must be a permutation of item ids.');});text('correctFeedback');text('incorrectFeedback');
    }
    if(c.model==='numeric'){['prompt','unit','correctFeedback','incorrectFeedback'].forEach(text);add(Number.isFinite(d.answer),'Numeric answer must be finite.');add(Number.isFinite(d.tolerance)&&d.tolerance>=0,'Tolerance must be finite and nonnegative.');}
    if(c.model==='reflection'){text('prompt');text('guidance');}
    if(c.model==='branching'){
      const a=arr('nodes',2);ids(a,'nodes');add(a.some(n=>n.id===d.start),'start must reference a node.');const graph=new Map(a.map(n=>[n.id,n]));
      a.forEach(n=>{add(isText(n?.prompt),'Branch nodes need prompt.');add(Array.isArray(n?.choices),'Branch nodes need choices (empty at endings).');(n?.choices||[]).forEach(x=>{add(isText(x?.id)&&isText(x?.text)&&isText(x?.feedback)&&graph.has(x?.next),'Each choice needs id, text, feedback and a valid next node.');});ids(n?.choices||[],'Node choices');if(!n?.choices?.length)add(isText(n?.ending),'Terminal node needs an ending.');});
      const seen=new Set(),stack=[d.start];while(stack.length){const id=stack.pop();if(seen.has(id)||!graph.has(id))continue;seen.add(id);(graph.get(id).choices||[]).forEach(x=>stack.push(x.next));}add(seen.size===a.length,'All branch nodes must be reachable.');
      const terminal=new Set(a.filter(n=>!n.choices?.length).map(n=>n.id));let changed=true;while(changed){changed=false;a.forEach(n=>{if(!terminal.has(n.id)&&(n.choices||[]).some(x=>terminal.has(x.next))){terminal.add(n.id);changed=true;}});}add(a.every(n=>terminal.has(n.id)),'Every branch must have a route to an ending.');
    }
    return {ok:!errors.length,errors};
  }
  function validate(c){try{return validateConfig(c);}catch(e){return {ok:false,errors:['Malformed content structure: '+e.message]};}}
  function preflight(c){const structure=validate(c),findings=[];if(!structure.ok)return {structural:'FAIL',authoring:'BLOCKED',release:'NOT_ASSESSED',findings:structure.errors};
    function scan(x,path){if(typeof x==='string'&&/REPLACE\s*:/i.test(x))findings.push(path+': unresolved placeholder');else if(x&&typeof x==='object')Object.entries(x).forEach(([k,v])=>scan(v,path+'.'+k));}
    scan(c,'activity');c.sources.forEach((s,i)=>{if(s.status!=='verified')findings.push('sources['+i+']: '+s.status+' — confirm provenance and teaching suitability');});
    return {structural:'PASS',authoring:findings.length?'REVIEW_REQUIRED':'READY_FOR_REVIEW',release:'NOT_ASSESSED',findings};
  }
  function assets(c){const found=new Set();const walk=x=>{if(!x||typeof x!=='object')return;if(x.kind&&x.src){found.add(x.src);if(x.captions)found.add(x.captions);if(x.poster)found.add(x.poster);}Object.values(x).forEach(v=>{if(typeof v==='object')walk(v);});};walk(c.content);return [...found];}
  const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
  function fingerprint(c){let h=2166136261;for(const ch of canonical(c)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return 'fnv1a32-'+(h>>>0).toString(16).padStart(8,'0');}
  function mount(root,configuration,options={}){
    const config=JSON.parse(JSON.stringify(configuration));const result=validate(config);if(!result.ok)throw new Error(result.errors.join('\n'));
    const d=config.content,model=config.model,signature=fingerprint(config);let disposed=false,mediaList=[],dialogs=[],counter=0;
    let state={startedAt:new Date().toISOString(),visited:[],answer:null,checked:false,branchPath:[],reflection:null};
    root.replaceChildren();root.classList.add('apgi');
    scope.APGIDesign.apply(root,config.design);
    const el=(tag,text,parent=root)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;parent.append(e);return e;};
    const button=(text,fn,parent=root)=>{const b=el('button',text,parent);b.type='button';b.onclick=fn;return b;};
    const uid=()=>config.id+'-'+(++counter);
    const stopMedia=()=>{mediaList.forEach(m=>{m.pause();});};
    const event=(type,detail={})=>{const payload={engineVersion:VERSION,activityId:config.id,model,type,at:new Date().toISOString(),...detail};root.dispatchEvent(new CustomEvent('apgi-interaction',{detail:payload,bubbles:true}));if(typeof options.onEvent==='function')options.onEvent(payload);};
    const note=el('p',config.identity.organisation+' • '+config.identity.unit+' • '+config.identity.activity);note.className='eyebrow';
    el('p',config.identity.course+' | '+config.identity.edition+' | Ungraded practice').className='eyebrow';
    el('h1',config.title);el('p',config.outcome).className='outcome';el('p',config.context);el('p',config.instruction).className='instruction';
    el('p','Responses stay in this page until you export them. No automatic saving, grade or LMS completion.').className='notice';
    const body=el('section');body.setAttribute('aria-label','Learning interaction');
    const status=el('p','');status.className='feedback';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const say=t=>{status.textContent=t;};
    const record=(answer,feedback,checked=false)=>{state.answer=JSON.parse(JSON.stringify(answer));state.checked=checked;say(feedback);event('response',{checked});};
    const visit=id=>{if(!state.visited.includes(id))state.visited.push(id);event('view',{itemId:id});};
    function media(m,parent){
      if(!m)return;mediaList=mediaList.filter(x=>x.isConnected);const frame=el('figure',undefined,parent);let src;
      try{src=options.resolveAsset?options.resolveAsset(m.src):m.src;}catch(e){say('Media unavailable: '+m.src);return;}
      if(m.kind==='image'){
        const image=el('img',undefined,frame);image.src=src;image.alt=m.alt;image.loading='lazy';image.onerror=()=>say('Image unavailable. Read its text alternative: '+m.alt);
        button('Enlarge image',()=>{stopMedia();const dialog=el('dialog',undefined,root);dialogs.push(dialog);dialog.setAttribute('aria-label','Enlarged image');const close=button('Close image',()=>dialog.close(),dialog);const large=el('img',undefined,dialog);large.src=src;large.alt=m.alt;dialog.addEventListener('close',()=>{dialog.remove();dialogs=dialogs.filter(x=>x!==dialog);});dialog.showModal();close.focus();},frame);
      }else{
        const player=el(m.kind,undefined,frame);player.controls=true;player.preload='none';player.src=src;player.autoplay=false;
        if(m.kind==='video'){player.playsInline=true;if(m.poster)player.poster=options.resolveAsset?options.resolveAsset(m.poster):m.poster;const track=el('track',undefined,player);track.kind='captions';track.srclang=m.language||'en';track.label='Captions';track.src=options.resolveAsset?options.resolveAsset(m.captions):m.captions;track.default=true;}
        player.addEventListener('play',()=>mediaList.filter(x=>x!==player).forEach(x=>x.pause()));player.addEventListener('error',()=>say('Media could not be loaded. Use the transcript; check the packaged file.'));mediaList.push(player);
        button('Stop media',()=>{player.pause();try{player.currentTime=0;}catch(e){}},frame);const tr=el('details',undefined,frame);el('summary','Read transcript',tr);el('p',m.transcript,tr);
      }
      if(m.caption)el('figcaption',m.caption,frame);
    }
    function panel(item,parent){el('h3',item.title,parent);el('p',item.body,parent);media(item.media,parent);media(item.narration,parent);}
    function selections(items,kind='rail',onChange=null){
      const wrap=el('div',undefined,body);wrap.className='explorer '+(kind==='tabs'?'tab-layout':'');const nav=el('div',undefined,wrap);nav.className='nav '+kind;
      const content=el('article',undefined,wrap);content.className='panel';content.id=uid();
      let selected=items.findIndex(i=>i.id===state.answer?.selected);if(selected<0)selected=0;const buttons=[];
      if(kind==='tabs'){nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Topics');nav.setAttribute('aria-orientation','vertical');content.setAttribute('role','tabpanel');}
      function draw(index,focus=false){stopMedia();selected=index;buttons.forEach((b,i)=>{b.classList.toggle('active',i===index);if(kind==='tabs'){b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1;}else b.setAttribute('aria-pressed',String(i===index));});content.replaceChildren();panel(items[index],content);if(kind==='tabs')content.setAttribute('aria-labelledby',buttons[index].id);state.answer={selected:items[index].id};visit(items[index].id);say('Viewing '+items[index].title+'.');if(onChange)onChange(index);if(focus)buttons[index].focus();}
      items.forEach((item,i)=>{const label=(kind==='steps'?i+1+'. ':kind==='timeline'?item.date+' — ':'')+item.title;const b=button(label,()=>draw(i),nav);b.id=uid();b.dataset.item=item.id;if(kind==='tabs'){b.setAttribute('role','tab');b.setAttribute('aria-controls',content.id);b.addEventListener('keydown',e=>{let n=i;if(['ArrowDown','ArrowRight'].includes(e.key))n=(i+1)%items.length;else if(['ArrowUp','ArrowLeft'].includes(e.key))n=(i-1+items.length)%items.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=items.length-1;else return;e.preventDefault();draw(n,true);});}buttons.push(b);});
      draw(selected);return {wrap,nav,content,draw,buttons};
    }
    function staged(items,image=false){
      let index=items.findIndex(x=>x.id===state.answer?.selected);if(index<0)index=0;
      const progress=el('p','',body);let canvas;
      if(image){canvas=el('div',undefined,body);canvas.className='image-map';const img=el('img',undefined,canvas);img.src=options.resolveAsset?options.resolveAsset(d.media.src):d.media.src;img.alt=d.media.alt;}
      const content=el('article',undefined,body);content.className='panel';const nav=el('div',undefined,body);nav.className='actions';
      const prev=button('Previous',()=>draw(index-1),nav),next=button('Next',()=>draw(index+1),nav);
      function draw(i){stopMedia();index=i;progress.textContent='Stage '+(i+1)+' of '+items.length;content.replaceChildren();panel(items[i],content);prev.disabled=i===0;next.disabled=i===items.length-1;state.answer={selected:items[i].id};visit(items[i].id);say(items[i].title);if(canvas){canvas.querySelector('.marker')?.remove();const spot=el('span',String(i+1),canvas);spot.className='marker current';spot.style.left=items[i].x+'%';spot.style.top=items[i].y+'%';spot.setAttribute('aria-hidden','true');} }
      draw(index);if(image){const detail=el('details',undefined,body);el('summary','Full image and enlargement',detail);media(d.media,detail);}
    }
    function render(){body.replaceChildren();stopMedia();mediaList=[];
      if(!['labeled-graphic','hotspot','guided-image'].includes(model))media(d.media,body);
      if(['tabs','steps','timeline','process'].includes(model)){selections(d.items,model);}
      else if(['sequence','guided-image'].includes(model)){staged(d.items,model==='guided-image');}
      else if(['accordion','faq'].includes(model)){
        const container=el('div',undefined,body);let search=null;const opened=new Set(state.answer?.open||[]);if(model==='faq'){const l=el('label','Search questions',body);search=el('input',undefined,l);search.type='search';search.value=state.answer?.search||'';body.insertBefore(l,container);search.oninput=()=>{state.answer={...(state.answer||{}),search:search.value};filter();say([...container.children].filter(x=>!x.hidden).length+' questions shown.');};}
        function filter(){if(search)[...container.children].forEach((node,i)=>node.hidden=!((d.items[i].title+' '+d.items[i].body).toLowerCase().includes(search.value.toLowerCase())));}
        d.items.forEach(item=>{const detail=el('details',undefined,container);detail.dataset.item=item.id;detail.open=opened.has(item.id);el('summary',item.title,detail);el('p',item.body,detail);media(item.media,detail);media(item.narration,detail);detail.ontoggle=()=>{if(!container.isConnected)return;stopMedia();state.answer={open:[...container.children].filter(x=>x.open).map(x=>x.dataset.item),...(search?{search:search.value}:{})};if(detail.open)visit(item.id);};});filter();
      }else if(model==='glossary'){
        const l=el('label','Search terms and definitions',body),search=el('input',undefined,l);search.type='search';search.value=state.answer?.search||'';const filters=el('div',undefined,body);filters.className='alphabet';const list=el('dl',undefined,body);let letter=state.answer?.letter||'All';const letters=['All',...new Set(d.items.map(x=>x.title[0].toUpperCase()).sort())];const bs=[];
        const draw=()=>{list.replaceChildren();bs.forEach(b=>b.setAttribute('aria-pressed',String(b.textContent===letter)));const shown=d.items.filter(x=>(letter==='All'||x.title[0].toUpperCase()===letter)&&(x.title+' '+x.body).toLowerCase().includes(search.value.toLowerCase()));shown.sort((a,b)=>a.title.localeCompare(b.title)).forEach(x=>{el('dt',x.title,list);el('dd',x.body,list);visit(x.id);});say(shown.length+' terms shown.');state.answer={letter,search:search.value};};letters.forEach(x=>bs.push(button(x,()=>{letter=x;draw();},filters)));search.oninput=draw;draw();
      }else if(model==='cyclic-process'){
        const wrap=el('div',undefined,body);wrap.className='cycle-explorer';
        const stage=el('div',undefined,wrap);stage.className='cycle-stage';
        const hint=el('p','Select a coloured segment to explore that step.',stage);hint.className='cycle-hint';
        const graphic=document.createElementNS('http://www.w3.org/2000/svg','svg');
        graphic.setAttribute('viewBox','0 0 500 420');graphic.classList.add('relationship','cycle-graphic');
        graphic.setAttribute('role','group');graphic.setAttribute('aria-label','Repeating cycle — '+d.items.map((x,i)=>(i+1)+'. '+x.title).join(', '));stage.append(graphic);
        const ns=graphic.namespaceURI,make=(tag,attrs,parent=graphic)=>{const x=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>x.setAttribute(k,v));parent.append(x);return x;};
        const defs=make('defs',{}),palette=[['#2868cf','#174ca1'],['#63791c','#4f6717'],['#bd4b12','#ac390b'],['#8750d7','#6125af'],['#147780','#08636b']];
        const content=el('article',undefined,wrap);content.className='panel cycle-panel';content.id=uid();content.setAttribute('aria-live','polite');
        const controls=[],n=d.items.length,point=(r,a)=>[250+r*Math.cos(a),210+r*Math.sin(a)].join(' ');
        let selected=d.items.findIndex(x=>x.id===state.answer?.selected);if(selected<0)selected=0;
        function draw(i,focus=false){stopMedia();selected=i;controls.forEach((g,j)=>{g.classList.toggle('selected',j===i);g.setAttribute('aria-pressed',String(j===i));g.tabIndex=j===i?0:-1;});content.replaceChildren();const count=el('p','Step '+(i+1)+' of '+n,content);count.className='cycle-step';panel(d.items[i],content);state.answer={selected:d.items[i].id};visit(d.items[i].id);say('Viewing '+d.items[i].title+'.');if(focus)controls[i].focus();}
        d.items.forEach((item,i)=>{
          const gradientId=uid(),colors=palette[i%palette.length],gradient=make('linearGradient',{id:gradientId,x1:'0',y1:'0',x2:'0',y2:'1'},defs);
          make('stop',{offset:'0%','stop-color':colors[0]},gradient);make('stop',{offset:'100%','stop-color':colors[1]},gradient);
          const a=i*2*Math.PI/n-Math.PI/2+.012,b=(i+1)*2*Math.PI/n-Math.PI/2-.012,large=b-a>Math.PI?1:0;
          const g=make('g',{class:'cycle-segment',role:'button','aria-label':(i+1)+'. '+item.title,'aria-controls':content.id,'data-item':item.id,tabindex:'-1'});
          make('title',{},g).textContent='Select '+item.title+' to read and hear the explanation.';
          const path=make('path',{d:'M '+point(185,a)+' A 185 185 0 '+large+' 1 '+point(185,b)+' L '+point(141.5,b+.09)+' L '+point(98,b)+' A 98 98 0 '+large+' 0 '+point(98,a)+' L '+point(141.5,a+.09)+' Z',fill:'url(#'+gradientId+')'},g);path.classList.add('cycle-sector');
          const mid=(a+b)/2,x=250+141.5*Math.cos(mid),y=210+141.5*Math.sin(mid),text=make('text',{x,y:y-9,'text-anchor':'middle',class:'cycle-label'},g);
          make('tspan',{x,dy:0,class:'cycle-number'},text).textContent=String(i+1);
          const words=item.title.split(/\s+/),lines=[];for(const word of words){if(!lines.length||lines.at(-1).length+word.length>15)lines.push(word);else lines[lines.length-1]+=' '+word;}
          lines.forEach((line,j)=>make('tspan',{x,dy:j?16:23},text).textContent=line);
          g.onclick=()=>draw(i);g.onkeydown=e=>{let next=i;if(e.key==='Enter'||e.key===' '){e.preventDefault();draw(i);return;}if(['ArrowRight','ArrowDown'].includes(e.key))next=(i+1)%n;else if(['ArrowLeft','ArrowUp'].includes(e.key))next=(i-1+n)%n;else if(e.key==='Home')next=0;else if(e.key==='End')next=n-1;else return;e.preventDefault();draw(next,true);};controls.push(g);
        });
        const center=make('text',{x:250,y:205,'text-anchor':'middle',class:'cycle-center'});make('tspan',{x:250,dy:0},center).textContent='↻';make('tspan',{x:250,dy:25},center).textContent='Repeat';
        draw(selected);
      }else if(['circle-diagram','pyramid'].includes(model)){
        const ui=selections(d.items,'diagram-list');const graphic=document.createElementNS('http://www.w3.org/2000/svg','svg');graphic.setAttribute('viewBox','0 0 440 340');graphic.setAttribute('aria-hidden','true');graphic.classList.add('relationship');ui.wrap.insertBefore(graphic,ui.nav);
        const shapes=[];const svg=(tag,attrs)=>{const n=document.createElementNS(graphic.namespaceURI,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));graphic.append(n);return n;};
        const n=d.items.length;d.items.forEach((item,i)=>{
          let shape;
          if(model==='pyramid'){const y=15+i*290/n,yn=15+(i+1)*290/n,half=25+i*170/n,halfn=25+(i+1)*170/n;shape=svg('polygon',{points:`${220-half},${y} ${220+half},${y} ${220+halfn},${yn-4} ${220-halfn},${yn-4}`});svg('text',{x:220,y:(y+yn)/2+5,'text-anchor':'middle'}).textContent=String(i+1);}
          else if(model==='circle-diagram'){shape=svg('circle',{cx:220,cy:165,r:145-i*120/n});}
          else {const a=(i/n)*Math.PI*2-Math.PI/2,b=((i+1)/n)*Math.PI*2-Math.PI/2-.045;const pt=(r,t)=>[220+r*Math.cos(t),165+r*Math.sin(t)].join(' ');shape=svg('path',{d:`M ${pt(143,a)} A 143 143 0 ${b-a>Math.PI?1:0} 1 ${pt(143,b)} L ${pt(76,b)} A 76 76 0 ${b-a>Math.PI?1:0} 0 ${pt(76,a)} Z`});const mid=(a+b)/2;svg('text',{x:220+108*Math.cos(mid),y:170+108*Math.sin(mid),'text-anchor':'middle'}).textContent=String(i+1);}
          shape.classList.add('diagram-shape');shapes.push(shape);
        });
        if(model==='cyclic-process')svg('text',{x:220,y:174,'text-anchor':'middle'}).textContent='↻ Repeat';
        const highlight=i=>shapes.forEach((s,j)=>s.classList.toggle('selected',j===i));ui.buttons.forEach((b,i)=>b.addEventListener('click',()=>highlight(i)));highlight(d.items.findIndex(x=>x.id===state.answer?.selected));
      }else if(['labeled-graphic','hotspot'].includes(model)){
        const canvas=el('div',undefined,body);canvas.className='image-map';const img=el('img',undefined,canvas);img.src=options.resolveAsset?options.resolveAsset(d.media.src):d.media.src;img.alt=d.media.alt;img.onerror=()=>say('Image unavailable. Use the labelled list below.');
        const list=el('div',undefined,body);list.className='nav';const content=el('article',undefined,body);content.className='panel';const markers=[],listButtons=[];
        const choose=i=>{stopMedia();content.replaceChildren();panel(d.items[i],content);[markers,listButtons].forEach(a=>a.forEach((b,j)=>{b.classList.toggle('active',i===j);b.setAttribute('aria-pressed',String(i===j));}));state.answer={selected:d.items[i].id};visit(d.items[i].id);say(d.items[i].title);};
        d.items.forEach((item,i)=>{const b=button(model==='hotspot'?String(i+1):item.title,()=>choose(i),canvas);b.className='marker';b.style.left=item.x+'%';b.style.top=item.y+'%';b.setAttribute('aria-label',(i+1)+'. '+item.title);markers.push(b);listButtons.push(button((i+1)+'. '+item.title,()=>choose(i),list));});
        const previous=d.items.findIndex(x=>x.id===state.answer?.selected);if(previous>=0)choose(previous);
        const detail=el('details',undefined,body);el('summary','Full image and enlargement',detail);media(d.media,detail);
      }else if(model==='media-catalog'){
        const grid=el('div',undefined,body);grid.className='cards';const detail=el('article',undefined,body);detail.className='panel';const open=item=>{stopMedia();detail.replaceChildren();panel(item,detail);visit(item.id);state.answer={selected:item.id};say('Opened '+item.title);};d.items.forEach(item=>{const card=el('article',undefined,grid);el('h3',item.title,card);el('p',item.body,card);button('Open '+item.title,()=>open(item),card);});const previous=d.items.find(x=>x.id===state.answer?.selected);if(previous)open(previous);
      }else if(model==='branching'){
        const nodes=new Map(d.nodes.map(n=>[n.id,n]));let current=state.branchPath.length?state.branchPath[state.branchPath.length-1].next:d.start;let pending=null;
        const history=el('details',undefined,body);el('summary','Decision path',history);const historyList=el('ol',undefined,history);const stage=el('article',undefined,body);stage.className='panel';
        const draw=()=>{stage.replaceChildren();historyList.replaceChildren();state.branchPath.forEach(p=>el('li',p.choiceText+' — '+p.feedback,historyList));const node=nodes.get(current);el('h3',node.prompt,stage);visit(current);
          if(!node.choices.length){el('p',node.ending,stage);record({path:state.branchPath},'Scenario ending reached. This is practice, not an assessment result.');return;}
          node.choices.forEach(choice=>button(choice.text,()=>{if(pending)return;pending=choice;stage.querySelectorAll('button').forEach(b=>b.disabled=true);const feedback=el('p',choice.feedback,stage);feedback.className='consequence';say(choice.feedback);button('Continue scenario',()=>{state.branchPath.push({node:current,choice:choice.id,choiceText:choice.text,feedback:choice.feedback,next:choice.next});state.answer={path:state.branchPath};current=choice.next;pending=null;draw();},stage).focus();},stage));};draw();
      }else if(['single','multiple'].includes(model)){
        const fs=el('fieldset',undefined,body);el('legend',d.prompt,fs);const inputs=d.options.map(x=>{const l=el('label',undefined,fs);const input=el('input',undefined,l);input.type=model==='single'?'radio':'checkbox';input.name=config.id+'-response';input.value=x.id;input.checked=Array.isArray(state.answer)&&state.answer.includes(x.id);l.append(document.createTextNode(x.text));input.onchange=()=>{state.answer=inputs.filter(i=>i.checked).map(i=>i.value);state.checked=false;say('Response changed. Check it when ready.');};return input;});
        button('Check response',()=>{const a=inputs.filter(i=>i.checked).map(i=>i.value);if(!a.length)return say('Select a response first.');const correct=a.length===d.correct.length&&a.every(x=>d.correct.includes(x));record(a,correct?d.correctFeedback:d.incorrectFeedback,true);},body);
      }else if(['classification','matching'].includes(model)){
        const grid=el('div',undefined,body);grid.className='assignment';const form=el('div',undefined,grid);const grouped=el('div',undefined,grid);grouped.className='groups';const inputs=[];
        const draw=()=>{grouped.replaceChildren();d.targets.forEach(t=>{const box=el('article',undefined,grouped);el('h3',t.title,box);inputs.forEach((s,i)=>{if(s.value===t.id)el('p',d.items[i].text,box);});});};
        d.items.forEach(x=>{const l=el('label',x.text,form),s=el('select',undefined,l);el('option','Choose '+(model==='matching'?'a match':'a group'),s).value='';d.targets.forEach(t=>el('option',t.title,s).value=t.id);s.value=state.answer?.[x.id]||'';inputs.push(s);s.onchange=()=>{state.answer=Object.fromEntries(inputs.map((v,i)=>[d.items[i].id,v.value]));state.checked=false;draw();};});draw();
        button(model==='matching'?'Check matches':'Check groups',()=>{if(inputs.some(s=>!s.value))return say('Choose a target for every item.');const a=Object.fromEntries(inputs.map((s,i)=>[d.items[i].id,s.value]));record(a,inputs.every((s,i)=>s.value===d.items[i].target)?d.correctFeedback:d.incorrectFeedback,true);},body);
      }else if(model==='ordering'){
        let order=Array.isArray(state.answer)?[...state.answer]:[...d.initialOrder];const list=el('ol',undefined,body);
        const draw=(focusId,dir)=>{list.replaceChildren();order.forEach((id,i)=>{const li=el('li',undefined,list);el('span',d.items.find(x=>x.id===id).text,li);['up','down'].forEach(direction=>{const delta=direction==='up'?-1:1;const b=button('Move '+direction,()=>{[order[i],order[i+delta]]=[order[i+delta],order[i]];state.answer=[...order];state.checked=false;draw(id,direction);say('Item moved to position '+(i+delta+1)+'.');},li);b.disabled=i+delta<0||i+delta>=order.length;b.setAttribute('aria-label','Move '+d.items.find(x=>x.id===id).text+' '+direction);b.dataset.item=id;b.dataset.direction=direction;});});if(focusId){const target=[...list.querySelectorAll('button')].find(b=>b.dataset.item===focusId&&b.dataset.direction===dir&&!b.disabled);(target||list.querySelector('button:not(:disabled)'))?.focus();}};draw();
        button('Check order',()=>record(order,order.every((x,i)=>x===d.correctOrder[i])?d.correctFeedback:d.incorrectFeedback,true),body);
      }else if(model==='numeric'){
        const l=el('label',d.prompt+' ('+d.unit+')',body),input=el('input',undefined,l);input.type='number';input.step='any';if(typeof state.answer?.value==='number')input.value=state.answer.value;
        input.oninput=()=>{state.answer=Number.isFinite(input.valueAsNumber)?{value:input.valueAsNumber,unit:d.unit}:null;state.checked=false;};
        button('Check calculation',()=>{if(!input.value.trim()||!Number.isFinite(input.valueAsNumber))return say('Enter a finite number first.');const v=input.valueAsNumber;record({value:v,unit:d.unit},Math.abs(v-d.answer)<=d.tolerance?d.correctFeedback:d.incorrectFeedback,true);},body);
      }else if(['comparison','reflection'].includes(model)){
        if(model==='comparison'){const grid=el('div',undefined,body);grid.className='cards';d.items.forEach(x=>{const a=el('article',undefined,grid);panel(x,a);});}
        const l=el('label',d.prompt,body),initial=el('textarea',undefined,l);initial.rows=4;initial.value=state.reflection?.initial||'';const guidance=el('section',undefined,body);guidance.hidden=!state.reflection?.opened;
        const open=button('Open guidance',()=>{if(!initial.value.trim())return say('Record your initial reasoning first.');state.reflection={initial:initial.value,opened:true,revised:'',reason:''};initial.readOnly=true;guidance.hidden=false;open.disabled=true;stopMedia();say(d.guidance);guidance.querySelector('textarea').focus();},body);body.insertBefore(open,guidance);
        initial.oninput=()=>{state.reflection={initial:initial.value,opened:false,revised:'',reason:''};};initial.readOnly=!!state.reflection?.opened;open.disabled=!!state.reflection?.opened;
        el('h3','Guidance',guidance);el('p',d.guidance,guidance);const lr=el('label','Revised response',guidance),revised=el('textarea',undefined,lr);revised.rows=4;revised.value=state.reflection?.revised||'';const le=el('label','Reason for revision (or why you retained your response)',guidance),reason=el('textarea',undefined,le);reason.rows=3;reason.value=state.reflection?.reason||'';
        const draft=()=>{if(state.reflection){state.reflection.revised=revised.value;state.reflection.reason=reason.value;}};revised.oninput=draft;reason.oninput=draft;
        button('Record revision',()=>{if(!revised.value.trim()||!reason.value.trim())return say('Provide a revised response and its reason.');draft();record({...state.reflection},'Revision recorded in this page. Export a copy if needed. No automatic correctness judgement.');},guidance);
      }
      media(d.narration,body);
    }
    render();
    const actions=el('div');actions.className='actions';const summary=el('section');summary.hidden=true;summary.tabIndex=-1;summary.className='panel';
    button('Show summary',()=>{stopMedia();summary.replaceChildren();el('h2','Activity summary',summary);el('p',config.summary,summary);el('p','You have viewed '+state.visited.length+' sections or states. Viewing is not proof of learning or course completion.',summary);summary.hidden=false;summary.focus();event('summary');},actions);
    const snapshot=()=>({recordVersion:1,engineVersion:VERSION,activityId:config.id,configFingerprint:signature,mode:'practice',evidenceStatus:'self-recorded-ungraded-not-competence',exportedAt:new Date().toISOString(),state:JSON.parse(JSON.stringify(state))});
    const download=(name,value)=>{const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download=name;a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);};
    button('Export my practice record',()=>{download(config.id+'-practice-record.json',snapshot());say('Download requested. Nothing was sent to an LMS or account.');event('export');},actions);
    const importLabel=el('label','Import my practice record',actions),importer=el('input',undefined,importLabel);importer.type='file';importer.accept='.json,application/json';
    function restore(record){
      if(!record||record.recordVersion!==1||record.engineVersion!==VERSION||record.activityId!==config.id||record.configFingerprint!==signature||record.mode!=='practice')throw Error('Record does not match this model and exact configuration.');
      const s=record.state;if(!s||!Array.isArray(s.visited)||s.visited.some(x=>typeof x!=='string')||!Array.isArray(s.branchPath)||typeof s.startedAt!=='string'||typeof s.checked!=='boolean')throw Error('Invalid practice state.');
      const validIds=(d.items||[]).map(x=>x.id);if(s.answer?.selected&&!validIds.includes(s.answer.selected))throw Error('Unknown selected item.');
      if(['accordion','faq'].includes(model)&&s.answer!==null&&(!Array.isArray(s.answer.open)||s.answer.open.some(x=>!validIds.includes(x))||(model==='faq'&&typeof s.answer.search!=='string')))throw Error('Invalid disclosure record.');
      if(model==='glossary'&&s.answer!==null&&(typeof s.answer.search!=='string'||!['All',...d.items.map(x=>x.title[0].toUpperCase())].includes(s.answer.letter)))throw Error('Invalid glossary record.');
      if(model==='ordering'&&s.answer!==null&&(!Array.isArray(s.answer)||s.answer.length!==validIds.length||new Set(s.answer).size!==validIds.length||s.answer.some(x=>!validIds.includes(x))))throw Error('Invalid order record.');
      if(['single','multiple'].includes(model)&&s.answer!==null&&(!Array.isArray(s.answer)||s.answer.some(x=>!d.options.some(o=>o.id===x))||new Set(s.answer).size!==s.answer.length||(model==='single'&&s.answer.length>1)))throw Error('Invalid choice record.');
      if(['classification','matching'].includes(model)&&s.answer!==null&&(typeof s.answer!=='object'||Array.isArray(s.answer)||Object.entries(s.answer).some(([key,value])=>!validIds.includes(key)||(value!==''&&!d.targets.some(t=>t.id===value)))))throw Error('Invalid assignment record.');
      if(model==='numeric'&&s.answer!==null&&(!Number.isFinite(s.answer?.value)||s.answer.unit!==d.unit))throw Error('Invalid numeric record.');
      if(s.reflection!==null&&(typeof s.reflection!=='object'||!['initial','revised','reason'].every(k=>typeof s.reflection[k]==='string')||typeof s.reflection.opened!=='boolean'))throw Error('Invalid reflection record.');
      let node=d.start;const path=[];s.branchPath.forEach(p=>{const n=d.nodes?.find(x=>x.id===node),choice=n?.choices.find(x=>x.id===p.choice);if(!choice||p.node!==node||p.next!==choice.next)throw Error('Invalid decision path.');path.push({node,choice:choice.id,choiceText:choice.text,feedback:choice.feedback,next:choice.next});node=choice.next;});
      state=JSON.parse(JSON.stringify(s));state.branchPath=path;state.checked=false;summary.hidden=true;render();say('Practice record restored. Self-recorded data is not verified assessment evidence.');event('restore');
    }
    importer.onchange=async()=>{try{if(importer.files[0].size>2e6)throw Error('Record exceeds 2 MB.');restore(JSON.parse(await importer.files[0].text()));}catch(e){say('Import rejected: '+e.message);}finally{importer.value='';}};
    button('Restart activity',()=>{stopMedia();dialogs.forEach(x=>x.close());state={startedAt:new Date().toISOString(),visited:[],answer:null,checked:false,branchPath:[],reflection:null};summary.hidden=true;render();say('Restarted. This page has no saved copy unless you exported one.');body.querySelector('button,input,textarea,summary')?.focus();event('restart');},actions);
    const sources=el('details');el('summary','Content provenance and status',sources);config.sources.forEach(s=>el('p',s.title+' | '+s.locator+' | '+s.status,sources));
    const visibility=()=>{if(document.hidden)stopMedia();};document.addEventListener('visibilitychange',visibility);const leave=()=>stopMedia();window.addEventListener('pagehide',leave);
    event('mount');return {version:VERSION,getRecord:snapshot,restore,stopMedia,destroy(){if(disposed)return;disposed=true;stopMedia();dialogs.forEach(x=>x.close());document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',leave);root.replaceChildren();event('destroy');}};
  }
  scope.APGIInteractions={version:VERSION,models:MODELS,validate,preflight,assets,fingerprint,mount};
  if(typeof module!=='undefined'&&module.exports)module.exports=scope.APGIInteractions;
})(typeof window==='undefined'?globalThis:window);
