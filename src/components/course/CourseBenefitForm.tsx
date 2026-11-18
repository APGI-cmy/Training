"use client";
import { useActionState, type ReactNode } from "react";
import { courseBenefitAction, reviewRetakeAction } from "@/server/actions/course-benefits";

export function CourseBenefitForm({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const [state, action, pending] = useActionState(admin ? reviewRetakeAction : courseBenefitAction, {});
  return <form action={action} className="benefit-form">
    <fieldset disabled={pending}>{children}</fieldset>
    {pending ? <p role="status">Recording your request…</p> : null}
    {state.error ? <p role="alert">{state.error}</p> : null}
    {state.message ? <p role="status">{state.message}</p> : null}
    {state.href ? <a className="primary-button" href={state.href}>Continue</a> : null}
  </form>;
}
