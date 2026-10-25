export type ReviewSlide = {number:number;title:string};
type SlideEvent = {addHandler:(handler:()=>void)=>void;removeHandler:(handler:()=>void)=>void};
export type ReviewPresentationPlayer = {
 view:()=>{playbackController:()=>{currentSlideIndex:()=>number;slideChangeEvent:()=>SlideEvent}};
 presentation:()=>{slides:()=>{getSlide:(index:number)=>{title?:()=>string}}};
};

// The exported iSpring connector and slide-change event are read-only here.
// No SCORM values, playback state, scores or learner progress are changed.
export function observeReviewSlides(player:ReviewPresentationPlayer,changed:(slide:ReviewSlide|null)=>void){
 const controller=player.view().playbackController(),event=controller.slideChangeEvent();
 const update=()=>{
  const index=controller.currentSlideIndex();
  if(!Number.isInteger(index)||index<0){changed(null);return;}
  let title='';
  try{title=String(player.presentation().slides().getSlide(index).title?.()??'').replace(/\s+/g,' ').trim().slice(0,160);}catch{/* Slide number remains usable. */}
  changed({number:index+1,title});
 };
 event.addHandler(update);update();
 return ()=>event.removeHandler(update);
}

export const courseWideReference='All slides — all learning units';
export const slideReference=(slide:ReviewSlide)=>`Slide ${slide.number}${slide.title?`: ${slide.title}`:''}`;

export function reviewFindingLocation(scope:string,number:string,title:string){
 if(scope==='course')return {scope:'course' as const,reference:courseWideReference};
 if(scope!=='current')throw Error('Choose Current slide or Applicable to all slides.');
 if(!/^[1-9]\d{0,4}$/.test(number))throw Error('The current slide is not available yet. Wait for the presentation to load before saving.');
 return {scope:'current' as const,reference:slideReference({number:Number(number),title:title.replace(/\s+/g,' ').trim().slice(0,160)})};
}
