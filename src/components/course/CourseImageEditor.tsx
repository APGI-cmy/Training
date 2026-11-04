'use client';
import {startTransition,useActionState,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ImageLibraryPanel} from '@/components/messages/EmailMediaLibrary';
import {saveCourseCardImage} from '@/server/actions/course-card-images';
import {libraryImage} from '@/lib/email-image-library';
import type {EmailLibraryImage} from '@/lib/email-sets';
import './CourseImageEditor.css';
type Workspace={companies:{id:string;name:string}[];images:EmailLibraryImage[]};
export function CourseImageEditor({course,title,current}:{course:string;title:string;current?:string}){
 const [open,setOpen]=useState(false),[workspace,setWorkspace]=useState<Workspace|null>(null),[company,setCompany]=useState(''),[loadError,setLoadError]=useState('');
 const [state,action,pending]=useActionState(saveCourseCardImage,{}),[alt,setAlt]=useState(title+' — course image');
 const dialog=useRef<HTMLDialogElement>(null),router=useRouter();
 useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close();},[open]);
 useEffect(()=>{if(state.success){setOpen(false);router.refresh();}},[state,router]);
 async function show(){setOpen(true);setLoadError('');if(workspace)return;try{const r=await fetch('/api/course-card-images/library',{cache:'no-store'});if(!r.ok)throw Error('Sign in with your APGI principal account to open the Image library.');const data=await r.json() as Workspace;setWorkspace(data);setCompany(data.images.find(i=>i.id===current)?.organisation_id??data.companies[0]?.id??'');}catch(e){setLoadError(e instanceof Error?e.message:'The Image library could not be opened.');}}
 function save(value:string,reset=false){const form=new FormData();form.set('course',course);form.set('alt',alt);form.set('operation',reset?'reset':'save');const image=workspace?.images.find(i=>i.url===value);form.set('image',image?.id??value);startTransition(()=>action(form));}
 return <div className="course-image-editor"><button type="button" className="secondary-button" onClick={show}>Change course image</button>{state.success?<p role="status">{state.success}</p>:null}
 <dialog ref={dialog} className="email-library-dialog course-image-dialog" aria-label={`Change image for ${title}`} onCancel={e=>{e.preventDefault();setOpen(false);}}>
 <div className="email-library-title"><h2>Course image · {title}</h2><button type="button" className="secondary-button" onClick={()=>setOpen(false)} disabled={pending}>Close</button></div>
 <p>Choose a course image from the Image library. Saving replaces the artwork on this course’s cards; course content and review progress stay saved.</p>
 {loadError?<p role="alert">{loadError}</p>:!workspace?<p role="status">Opening Image library…</p>:<fieldset disabled={pending} className="course-image-fields">
 <label>Image description<input value={alt} onChange={e=>setAlt(e.target.value)} maxLength={250} required/></label>
 <label>Company image library<select value={company} onChange={e=>setCompany(e.target.value)}>{workspace.companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 {company?<ImageLibraryPanel key={company} company={company} images={workspace.images} courses={[{id:course,title}]} course={course} value={libraryImage(current??'')?current:workspace.images.find(i=>i.id===current)?.url??''} initialPurpose="course" useLabel="Use selected image for this course" onUse={(v,image)=>save(image?.id??v)}/>:<p>No company image library is available.</p>}
 {current?<button type="button" className="secondary-button" onClick={()=>save('',true)}>Restore original course image</button>:null}
 </fieldset>}
 {pending?<p role="status">Saving course image…</p>:null}{state.error?<p role="alert">{state.error}</p>:null}
 </dialog></div>;
}
