"use client";

import { type ReactNode, useActionState } from "react";
import { Button, type ButtonTone } from "../button";
import { Icon } from "../icon";
import { Select } from "../select";
import { TextInput } from "../text-input";
import type { FormAction, FormResult } from "./email-capture";
import classes from "./forms.module.css";

interface PilotSignupFormProps {
  action: FormAction;
  emailLabel: string;
  emailPlaceholder?: string;
  gradeLabel: string;
  gradePlaceholder?: string;
  /** Options for "grade you teach". */
  grades: string[];
  submitLabel: string;
  pendingLabel: string;
  fineprint?: ReactNode;
  tone?: ButtonTone;
}

/** Teacher pilot signup: work email plus the grade they teach. */
export function PilotSignupForm({
  action,
  emailLabel,
  emailPlaceholder,
  gradeLabel,
  gradePlaceholder,
  grades,
  submitLabel,
  pendingLabel,
  fineprint,
  tone = "educator",
}: PilotSignupFormProps) {
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
      <TextInput
        label={emailLabel}
        name="email"
        type="email"
        placeholder={emailPlaceholder}
        autoComplete="email"
        required
      />
      <Select
        label={gradeLabel}
        name="grade"
        data={grades}
        placeholder={gradePlaceholder}
        required
      />
      {result && !result.ok && (
        <p className={classes.error} role="alert">
          {result.message}
        </p>
      )}
      <Button type="submit" tone={tone} disabled={pending} size="lg" fullWidth>
        {pending ? pendingLabel : submitLabel}
      </Button>
      {fineprint && <p className={classes.fine}>{fineprint}</p>}
    </form>
  );
}
