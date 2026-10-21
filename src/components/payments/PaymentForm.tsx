"use client";
import {useActionState,type ReactNode} from "react";
import type {PaymentState} from "@/server/actions/stripe-payments";
export function PaymentForm({action,children,label}:{action:(state:PaymentState,form:FormData)=>Promise<PaymentState>;children?:ReactNode;label:string}){
 const [state,dispatch,pending]=useActionState(action,{});
 return <form action={dispatch} className="admin-form"><fieldset disabled={pending} style={{border:0,padding:0,display:"grid",gap:"1rem"}}>{children}<button type="submit" className="primary-button">{pending?"Please wait…":label}</button></fieldset>{state.error?<p role="alert">{state.error}</p>:null}{state.success?<p role="status">{state.success}</p>:null}{state.url?<p><a className="primary-button" href={state.url}>Continue securely in Stripe</a></p>:null}</form>;
}
