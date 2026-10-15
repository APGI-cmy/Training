"use client";
import { useActionState, useEffect, type ReactNode } from "react";
import type { StructureState } from "@/lib/company-structure";
export function StructureForm({
  action,
  children,
  label = "Save draft",
  className = "admin-form-grid",
}: {
  action: (state: StructureState, form: FormData) => Promise<StructureState>;
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const [state, submit, pending] = useActionState(action, {});
  useEffect(() => {
    if (state.success) window.dispatchEvent(new Event("alp-branding-updated"));
  }, [state.success]);
  return (
    <form action={submit} className={className}>
      {children}
      <div className="admin-span-two">
        <button className="primary-button" disabled={pending}>
          {pending ? "Saving…" : label}
        </button>
        {state.error ? (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="form-success" role="status">
            {state.success}
          </p>
        ) : null}
        {state.link ? (
          <a href={state.link}>Open captured test invitation</a>
        ) : null}
      </div>
    </form>
  );
}
