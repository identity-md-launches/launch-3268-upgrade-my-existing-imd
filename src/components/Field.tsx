import type { InputHTMLAttributes, ReactNode } from "react";

type Props = { id: string; label: string; error?: string; hint?: ReactNode } & InputHTMLAttributes<HTMLInputElement>;

/** Label, input, hint and error wired together; the error is announced through aria-describedby. */
export function Field({ id, label, error, hint, ...input }: Props) {
  const describedBy = [error ? `${id}-error` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} data-field={id} autoComplete="off" aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...input} />
      {hint && <p id={`${id}-hint`} className="hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="error">{error}</p>}
    </div>
  );
}
