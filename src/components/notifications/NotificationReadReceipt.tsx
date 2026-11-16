"use client";
import {useState,useTransition} from "react";
import {notificationAction,type NotificationState} from "@/server/actions/notifications";
import {notificationReference,type PersonalNotification} from "@/lib/notifications";

export function NotificationReadReceipt({item}:{item:PersonalNotification}){
 const [state,setState]=useState<NotificationState>({});
 const [pending,startTransition]=useTransition();
 const recorded=!!item.read_at||!!state.success;
 function recordRead(){
  startTransition(async()=>{
   const form=new FormData();form.set("id",item.id);form.set("operation","read");
   try{
    const result=await notificationAction({},form);setState(result);
    if(result.success)window.dispatchEvent(new Event("apgi-notifications-changed"));
   }catch{setState({error:"The read receipt could not be saved. Please try again."});}
  });
 }
 return <div className="notification-read-receipt">
  {recorded?<p role="status">✓ Read receipt recorded</p>:<button type="button" className="secondary-button" aria-label={`Read receipt for ${notificationReference(item)}`} disabled={pending} onClick={recordRead}>{pending?"Saving read receipt…":"Read receipt"}</button>}
  {state.error?<p role="alert" className="form-error">{state.error}</p>:null}
 </div>;
}
