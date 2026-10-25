'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {observeReviewSlides,type ReviewPresentationPlayer,type ReviewSlide} from '@/lib/review-slide';

const SlideContext=createContext<ReviewSlide|null>(null);
export const useReviewSlide=()=>useContext(SlideContext);

export function ReviewSlideTracking({children}:{children:ReactNode}){
 const [slide,setSlide]=useState<ReviewSlide|null>(null),[ready,setReady]=useState(false);
 useEffect(()=>{
  let release:(()=>void)|undefined;
  const previous=window.ispringPresentationConnector;
  const connector={register(player:ReviewPresentationPlayer){
   release?.();setSlide(null);
   try{release=observeReviewSlides(player,setSlide);}catch{/* Saving current-slide feedback waits for a recognised player. */}
   previous?.register(player);
  }};
  window.ispringPresentationConnector=connector;setReady(true);
  return ()=>{release?.();if(window.ispringPresentationConnector===connector){if(previous)window.ispringPresentationConnector=previous;else delete window.ispringPresentationConnector;}};
 },[]);
 return <SlideContext.Provider value={slide}>{ready?children:<p role="status">Preparing presentation and slide tracking…</p>}</SlideContext.Provider>;
}

declare global{interface Window{ispringPresentationConnector?:{register:(player:ReviewPresentationPlayer)=>void}}}
