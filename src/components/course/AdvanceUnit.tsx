"use client";

import { useActionState } from "react";
import { completeVpshrAndContinue, type AdvanceUnitState } from "@/server/actions/progress/complete-vpshr-and-continue";
import { updatePreviewProgress } from "./PreviewProgress";
import "./advance-unit.css";

export function AdvanceUnit({courseSlug,unitSlug,unitId,href,label,previewScope}:{courseSlug:string;unitSlug:string;unitId:string;href:string;label:string;previewScope?:string}) {
  const [state,action,pending]=useActionState(completeVpshrAndContinue.bind(null,{courseSlug,unitSlug}),{} as AdvanceUnitState);
  function previewNext() {
    updatePreviewProgress(previewScope!,current=>({...current,opened:[...new Set([...current.opened,unitId])],completed:[...new Set([...current.completed,unitId])]}));
    window.location.assign(href);
  }
  return <form className="unit-advance" action={previewScope?previewNext:action}>
    <button className="primary-button" type="submit" disabled={pending}>{pending?"Saving completion…":label}</button>
    {state.error?<p className="form-error" role="alert">{state.error}</p>:null}
  </form>;
}
