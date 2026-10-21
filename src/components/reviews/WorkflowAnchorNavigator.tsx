"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";
export function WorkflowAnchorNavigator(){
 const pathname=usePathname();
 useEffect(()=>{
  let frame:number|undefined;
  function reveal(){let id:string;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}if(!id)return;const target=document.getElementById(id);if(!target)return;
   for(let node:HTMLElement|null=target;node;node=node.parentElement)if(node instanceof HTMLDetailsElement)node.open=true;
   if(frame!==undefined)cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{target.scrollIntoView({block:"start",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});target.setAttribute("tabindex","-1");target.focus({preventScroll:true});});
  }
  function sameAnchor(event:MouseEvent){const link=event.target instanceof Element?event.target.closest("a"):null;if(link instanceof HTMLAnchorElement&&link.origin===location.origin&&link.pathname===location.pathname&&link.hash===location.hash)reveal();}
  reveal();window.addEventListener("hashchange",reveal);document.addEventListener("click",sameAnchor);return ()=>{window.removeEventListener("hashchange",reveal);document.removeEventListener("click",sameAnchor);if(frame!==undefined)cancelAnimationFrame(frame);};
 },[pathname]);return null;
}
