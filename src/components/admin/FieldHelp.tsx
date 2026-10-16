"use client";
import { useId, useState } from "react";
export function FieldHelp({ text, label }: { text: string; label: string }) {
  const id = useId(); const [open, setOpen] = useState(false);
  const [position,setPosition] = useState({left:8,top:8});
  const show = (element: HTMLElement) => { const rect=element.getBoundingClientRect(); const width=Math.min(304,window.innerWidth*.65);setPosition({left:Math.max(8,Math.min(rect.left,window.innerWidth-width-12)),top:rect.bottom+8});setOpen(true); };
  return <span className="field-help" onMouseEnter={event => show(event.currentTarget)} onMouseLeave={() => setOpen(false)}>
    <button type="button" className="field-help-button" aria-label={`Help: ${label}`} aria-expanded={open} aria-controls={id} onFocus={event => show(event.currentTarget)} onBlur={() => setOpen(false)} onClick={event => show(event.currentTarget)} onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}>?</button>
    <span id={id} style={position} className="field-help-text" hidden={!open} role="tooltip">{text}</span>
  </span>;
}
