'use client';
import {useEffect,useRef,useState,type ClipboardEvent} from 'react';
import {screenshotError,screenshotTypes} from '@/lib/review-screenshot';

export function ReviewScreenshot(){
 const input=useRef<HTMLInputElement>(null);
 const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return ()=>URL.revokeObjectURL(url);},[file]);
 function attach(next:File,fromClipboard=false){
  const error=screenshotError(next);if(error){setNotice(error);return;}
  if(fromClipboard&&input.current){const transfer=new DataTransfer();transfer.items.add(next);input.current.files=transfer.files;}
  setFile(next);setNotice('Screenshot attached. Check the preview before saving.');
 }
 function paste(event:ClipboardEvent){
  const next=[...event.clipboardData.files].find(item=>item.type.startsWith('image/'));
  if(next){event.preventDefault();attach(next,true);}
 }
 async function readClipboard(){
  try{
   if(!navigator.clipboard?.read){setNotice('Click the paste area and press Ctrl+V to attach your copied screenshot.');return;}
   for(const item of await navigator.clipboard.read()){
    const type=item.types.find(type=>screenshotTypes.includes(type));if(!type)continue;
    const blob=await item.getType(type);attach(new File([blob],`review-screenshot.${type==='image/jpeg'?'jpg':type.split('/')[1]}`,{type}),true);return;
   }
   setNotice('No image was found. Copy a screenshot, then paste it here.');
  }catch{setNotice('Clipboard access was unavailable. Click the paste area and press Ctrl+V, or choose an image file.');}
 }
 return <fieldset onPaste={paste}><legend>Screenshot (optional)</legend>
  <p>Capture just the area you need with Windows + Shift + S, then paste it here.</p>
  <div className="review-paste-area" tabIndex={0} role="group" aria-label="Paste screenshot area">Click here and press Ctrl+V to paste a screenshot.</div>
  <button type="button" className="secondary-button" onClick={()=>void readClipboard()}>Paste screenshot</button>
  <label>Choose an image file (PNG, JPEG or WebP, up to 2 MB)<input ref={input} type="file" name="screenshot" accept="image/png,image/jpeg,image/webp" onChange={e=>{const next=e.target.files?.[0];if(next){const error=screenshotError(next);if(error){e.target.value='';setFile(null);setNotice(error);}else attach(next);}else setFile(null);}}/></label>
  {file?<><p>{file.name}</p>{preview?<img className="review-evidence" src={preview} alt="Attached screenshot preview"/>:null}<button type="button" className="secondary-button" onClick={()=>{if(input.current)input.current.value='';setFile(null);setNotice('Screenshot removed from this draft.');}}>Remove attached screenshot</button></>:null}
  {notice?<p role="status">{notice}</p>:null}
 </fieldset>;
}
