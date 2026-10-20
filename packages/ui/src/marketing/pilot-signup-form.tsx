"use client";

import type { ReactNode } from "react";
import { Button } from "../button";
import { Select } from "../select";
import { TextInput } from "../text-input";
import type { Tone } from "../tone";
import { type FormAction, FormSuccess, useFormAction } from "./form-action";
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
  tone?: Tone;
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
  const [result, submit, pending] = useFormAction(action);

  if (result?.ok) return <FormSuccess message={result.message} />;

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
