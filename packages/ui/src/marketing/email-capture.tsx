"use client";

import type { ReactNode } from "react";
import { Button } from "../button";
import { TextInput } from "../text-input";
import type { Tone } from "../tone";
import { type FormAction, FormSuccess, useFormAction } from "./form-action";
import classes from "./forms.module.css";

interface EmailCaptureProps {
  action: FormAction;
  label: string;
  placeholder?: string;
  submitLabel: string;
  pendingLabel: string;
  /** Reassurance under the field, e.g. what you'll send and how often. */
  fineprint?: ReactNode;
  tone?: Tone;
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
  const [result, submit, pending] = useFormAction(action);

  if (result?.ok) return <FormSuccess message={result.message} />;

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
