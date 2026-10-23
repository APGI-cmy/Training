'use client';
import {startTransition,useActionState,useEffect,useRef,useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {emailSetAction} from '@/server/actions/email-sets';
import {EmailImagePicker} from './EmailImagePicker';
import {libraryImagePath} from '@/lib/email-image-library';
import {getCourseCover} from '@/lib/course-covers';
import type {EmailLibraryImage,EmailWorkspace} from '@/lib/email-sets';
type Course={id:string;title:string};

export function ImageLibraryPanel({company,images,courses,course='',value='',onUse}:{company:string;images:EmailLibraryImage[];courses:Course[];course?:string;value?:string;onUse?:(value:string)=>void}){
 const [selected,setSelected]=useState(value),[courseFilter,setCourseFilter]=useState(course),[purpose,setPurpose]=useState('email'),[search,setSearch]=useState(''),[includeShared,setIncludeShared]=useState(true),[added,setAdded]=useState<EmailLibraryImage[]>([]);
 const [state,action,pending]=useActionState(emailSetAction,{});
 const router=useRouter();
 useEffect(()=>{if(state.image){setAdded(items=>[state.image!,...items.filter(item=>item.id!==state.image!.id)]);setSelected(state.image.url);router.refresh();}},[state.image,router]);
 function upload(event:FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);startTransition(()=>action(data));}
 const all=[...added,...images.filter(image=>!added.some(item=>item.id===image.id))].filter(image=>image.organisation_id===company);
 const filtered=all.filter(image=>(!courseFilter||image.course_id===courseFilter)&&(purpose==='all'||image.purpose===purpose||image.purpose==='both')&&image.title.toLowerCase().includes(search.toLowerCase()));
 const preview=libraryImagePath(selected)??(selected==='course'?getCourseCover(courseFilter||course)?.src:selected.startsWith('https://')?selected:null);
 return <div className="image-library-panel"><p>Reuse images for a particular course, for emails, or for both. Your company uploads are separate from other companies. Shared neutral images are available to everyone.</p>
 <div className="email-filters"><label>Filter by course<select value={courseFilter} onChange={e=>setCourseFilter(e.target.value)}><option value="">All courses</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label><label>Filter by use<select value={purpose} onChange={e=>setPurpose(e.target.value)}><option value="all">Courses and emails</option><option value="course">Course images (including both)</option><option value="email">Email images (including both)</option></select></label></div>
 <label>Find an uploaded image<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search image titles"/></label>
 <h3>Company image library ({filtered.length})</h3>{filtered.length?<div className="email-library-uploaded">{filtered.map(image=><button type="button" key={image.id} className={selected===image.url?'email-image-choice selected':'email-image-choice'} aria-pressed={selected===image.url} onClick={()=>setSelected(image.url)}><img src={image.url} alt={image.title} loading="lazy"/><strong>{image.title}</strong><span>{courses.find(c=>c.id===image.course_id)?.title??'General company image'} · {image.purpose==='both'?'Courses and emails':image.purpose==='email'?'Email':'Course'}</span></button>)}</div>:<p>No uploaded images match these filters. Change the filters or import an image below.</p>}
 <label className="email-check"><input type="checkbox" checked={includeShared} onChange={e=>setIncludeShared(e.target.checked)}/> Include shared neutral images</label>
 {includeShared?<EmailImagePicker key={selected.startsWith('library:')?selected.split('-').slice(0,-1).join('-'):'shared'} value={selected} onChange={setSelected}/>:null}
 <details className="email-library-import"><summary>Upload an image or graphic to this library</summary><form onSubmit={upload}>
 <input type="hidden" name="operation" value="upload-image"/><input type="hidden" name="organisation_id" value={company}/>
 <label>Image title<input name="image_title" required maxLength={120} placeholder="For example: Tiger course — family awareness"/></label>
 <div className="email-filters"><label>Assign to course<select key={courseFilter} name="image_course" defaultValue={courseFilter}><option value="">General company image</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label><label>Use this image for<select name="image_purpose" defaultValue="both"><option value="course">Course</option><option value="email">Email</option><option value="both">Courses and emails</option></select></label></div>
 <label>Image file<input type="file" name="graphic" accept="image/png,image/jpeg,image/webp" required/></label><p>PNG, JPEG or WebP, up to 2 MB. Imported email graphics are publicly accessible to recipients. Use images you have permission to share and avoid confidential information.</p>
 <button disabled={pending}>{pending?'Importing…':'Import into image library'}</button>{state.error?<p role="alert" className="message-error">{state.error}</p>:null}{state.success?<p role="status" className="message-success">{state.success}</p>:null}
 </form></details>
 <p className="email-note">Create an image: planned for Version 3. For now, upload existing course artwork or choose a shared image.</p>
 {preview?<figure className="email-selected-graphic"><img src={preview} alt="Selected image preview"/><figcaption>Selected image preview</figcaption></figure>:null}
 {onUse?<button type="button" disabled={!selected} onClick={()=>onUse(selected)}>Use selected image in this message</button>:null}
 </div>;
}

export function EmailLibraryDialog({onClose,...props}:{onClose:()=>void;company:string;images:EmailLibraryImage[];courses:Course[];course:string;value:string;onUse:(value:string)=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close();},[]);
 return <dialog ref={dialog} className="email-library-dialog" aria-labelledby="image-library-title" onCancel={event=>{event.preventDefault();onClose();}}><div className="email-library-title"><h2 id="image-library-title">Image library</h2><button type="button" onClick={onClose}>Close library</button></div><ImageLibraryPanel {...props}/></dialog>;
}

export function CompanyImageLibrary({workspace,courses}:{workspace:EmailWorkspace;courses:Course[]}){
 const [company,setCompany]=useState(workspace.companies[0]?.id??'');
 return <main className="message-page email-workbench"><p className="email-eyebrow">Messages and support</p><h1>Image library</h1><label>Company workspace<select value={company} onChange={e=>setCompany(e.target.value)}>{workspace.companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><section><ImageLibraryPanel key={company} company={company} images={workspace.images??[]} courses={courses}/></section></main>;
}
