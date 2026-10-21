"use client";
import {useActionState,useEffect} from "react";
import {useRouter} from "next/navigation";
import {notificationAction,type NotificationState} from "@/server/actions/notifications";
import type {PersonalNotification} from "@/lib/notifications";
export function NotificationControls({item,all=false}:{item?:PersonalNotification;all?:boolean}){
 const [state,action,pending]=useActionState<NotificationState,FormData>(notificationAction,{}),router=useRouter();
 useEffect(()=>{if(state.success){window.dispatchEvent(new Event("apgi-notifications-changed"));router.refresh();}},[state,router]);
 return <form action={action} className="notification-controls">{item?<input name="id" type="hidden" value={item.id}/>:null}
 {all?<button name="operation" value="all_read" className="secondary-button" disabled={pending}>Mark all as read</button>:<>
 <button name="operation" value="open" className="primary-button" disabled={pending}>{item?.pending&&item.response_type==="action"?"Open required action":"Open update"}</button>
 {!item?.read_at?<button name="operation" value="read" className="secondary-button" disabled={pending}>Mark as read</button>:null}
 {item?.response_type==="acknowledge"&&!item.acknowledged_at?<button name="operation" value="acknowledge" className="secondary-button" disabled={pending}>Acknowledge receipt</button>:null}</>}
 {state.error?<p role="alert" className="form-error">{state.error}</p>:null}{state.success?<p role="status" className="form-success">{state.success}</p>:null}</form>;
}
