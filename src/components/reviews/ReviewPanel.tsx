"use client";
import {useRef,useState} from "react";
import {ReviewForm} from "./ReviewForms";
export function ReviewPanel({id,unit,canEdit}:{id:string;unit:string;canEdit:boolean}){
 const [open,setOpen]=useState(false),[message,setMessage]=useState("");const upload=useRef<HTMLInputElement>(null);
 async function snapshot(){let stream:MediaStream|undefined;try{
  stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
  const video=document.createElement("video");video.srcObject=stream;await video.play();
  const canvas=document.createElement("canvas");canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext("2d")!.drawImage(video,0,0);
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/png"));
  if(blob&&upload.current){const data=new DataTransfer();data.items.add(new File([blob],"review-screenshot.png",{type:"image/png"}));upload.current.files=data.files;setMessage("Snapshot attached. Add your reference and comment, then save.");}
 }catch{setMessage("Capture was cancelled or is unavailable. You can upload a screenshot instead.");}finally{stream?.getTracks().forEach(t=>t.stop());}}
 return <aside className="review-floating" aria-label="Course feedback"><button className="primary-button" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?"Close feedback":"Review feedback"}</button>{open?<div className="review-floating-body"><h2>Feedback for {unit.toUpperCase()}</h2><p>Shared privately with this review team. Enter the slide or quiz/question reference shown in the player.</p>{canEdit?<ReviewForm id={id} operation="finding" hidden={{unit}} label="Save finding"><label>Slide / quiz / question reference<input name="reference" required maxLength={200}/></label><label>Category<select name="category"><option>Content</option><option>Quiz or scoring</option><option>Navigation</option><option>Accessibility</option><option>Design</option></select></label><label><input name="blocking" type="checkbox"/> Blocks publication until fixed and verified</label><label>What should change?<textarea name="comment" required minLength={3} maxLength={5000}/></label><button type="button" className="secondary-button" onClick={snapshot}>Take a snapshot</button><label>Screenshot (optional, up to 2 MB)<input ref={upload} type="file" name="screenshot" accept="image/png,image/jpeg,image/webp"/></label>{message?<p role="status">{message}</p>:null}</ReviewForm>:<p>Your report is committed, or this review is closed. Use the team workspace to revise your report or request an extension.</p>}</div>:null}</aside>;
}
