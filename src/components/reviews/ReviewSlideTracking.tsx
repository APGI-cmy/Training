'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {playerBelongsToReview,registerReviewSlideSession,type ReviewSlideConnector,type ReviewSlide} from '@/lib/review-slide';

const SlideContext=createContext<{unit:string;slide:ReviewSlide|null}|null>(null);
export const useReviewSlide=(unit:string)=>{const context=useContext(SlideContext);return context?.unit===unit?context.slide:null;};

export function ReviewSlideTracking({unit,children}:{unit:string;children:ReactNode}){
 const root=useRef<HTMLDivElement>(null);
 const [location,setLocation]=useState<{unit:string;slide:ReviewSlide|null}|null>(null),[readyUnit,setReadyUnit]=useState('');
 useEffect(()=>{
  setLocation(null);
  const release=registerReviewSlideSession(window,player=>!!root.current&&playerBelongsToReview(player,root.current),slide=>setLocation({unit,slide}));
  setReadyUnit(unit);
  return release;
 },[unit]);
 return <SlideContext.Provider value={{unit,slide:location?.unit===unit?location.slide:null}}><div ref={root} data-review-unit={unit}>{readyUnit===unit?children:<p role="status">Preparing presentation and slide tracking…</p>}</div></SlideContext.Provider>;
}

declare global{interface Window{ispringPresentationConnector?:ReviewSlideConnector}}
