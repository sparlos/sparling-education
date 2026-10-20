"use client";

import { type ReactNode, useActionState } from "react";
import { Button, type ButtonTone } from "../button";
import { Icon } from "../icon";
import { TextInput } from "../text-input";
import classes from "./forms.module.css";

/** What a form's server action reports back. */
export interface FormResult {
  ok: boolean;
  message: string;
}

export type FormAction = (formData: FormData) => Promise<FormResult>;

interface EmailCaptureProps {
  action: FormAction;
  label: string;
  placeholder?: string;
  submitLabel: string;
  pendingLabel: string;
  /** Reassurance under the field, e.g. what you'll send and how often. */
  fineprint?: ReactNode;
  tone?: ButtonTone;
  /** Extra values sent with the form, e.g. which page it came from. */
  hidden?: Record<string, string>;
}

/** A single email field with an inline submit button. */
export function EmailCapture({
  action,
  label,
  placeholder,
  submitLabel,
  pendingLabel,
  fineprint,
  tone,
  hidden,
}: EmailCaptureProps) {
  const [result, submit, pending] = useActionState<FormResult | null, FormData>(
    (_previous, formData) => action(formData),
    null,
  );

  if (result?.ok) {
    return (
      <p className={classes.status} role="status">
        <Icon name="check" size={24} />
        {result.message}
      </p>
    );
  }

  return (
    <form action={submit} className={classes.form}>
      {hidden &&
        Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      <div className={classes.inline}>
        <TextInput
          label={label}
          name="email"
          type="email"
          placeholder={placeholder}
          autoComplete="email"
          required
          error={result && !result.ok ? result.message : undefined}
        />
        <Button type="submit" tone={tone} disabled={pending} size="md">
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
      {fineprint && <p className={classes.fine}>{fineprint}</p>}
    </form>
  );
}
