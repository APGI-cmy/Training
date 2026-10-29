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
