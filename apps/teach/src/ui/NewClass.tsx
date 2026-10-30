// Making a class: the form teachers land on with no classes, and reach from
// the class switcher's "New class".

import { classColours } from "@repo/tokens";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { CheckboxGroup } from "@repo/ui/checkbox-group";
import { ColourPicker } from "@repo/ui/colour-picker";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { TextInput } from "@repo/ui/text-input";
import { Title } from "@repo/ui/title";
import { type FormEvent, useState } from "react";
import {
  type ClassColourSlug,
  type ClassGrade,
  classGrades,
  classNameMaxLength,
  type NewClass,
} from "../platform/ports.ts";
import classes from "./classes.module.css";

export function NewClassScreen({
  first,
  colour,
  onCreate,
  onCancel,
}: {
  /** The teacher has no classes yet: nothing to cancel back to. */
  first: boolean;
  /** The class colour picked to start with. */
  colour: ClassColourSlug;
  /** Makes the class, and resolves once it's made. */
  onCreate(draft: NewClass): Promise<void>;
  onCancel(): void;
}) {
  return (
    <Stack gap="lg">
      <Title order={1}>{first ? "Make your first class" : "New class"}</Title>
      <NewClassForm
        colour={colour}
        onCreate={onCreate}
        onCancel={first ? null : onCancel}
      />
    </Stack>
  );
}

function NewClassForm({
  colour: initial,
  onCreate,
  onCancel,
}: {
  colour: ClassColourSlug;
  onCreate(draft: NewClass): Promise<void>;
  onCancel: (() => void) | null;
}) {
  const [colour, setColour] = useState(initial);
  const [errors, setErrors] = useState<{ name?: string; grades?: string }>({});
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const grades = String(form.get("grades") ?? "")
      .split(",")
      .filter(Boolean)
      .map(Number) as ClassGrade[];
    const found = {
      name: name ? undefined : "Give the class a name.",
      grades: grades.length > 0 ? undefined : "Pick at least one grade.",
    };
    setErrors(found);
    if (found.name || found.grades) return;

    setState("busy");
    onCreate({ name, grades, colour }).catch((error: unknown) => {
      console.error("[teach] Couldn't make a class", error);
      setState("failed");
    });
  }

  return (
    <Card>
      <form onSubmit={submit} noValidate aria-label="New class">
        <Stack gap="md">
          <TextInput
            label="Class name"
            name="name"
            placeholder="Room 12"
            autoComplete="off"
            maxLength={classNameMaxLength}
            error={errors.name}
          />
          <CheckboxGroup
            label="Grades"
            name="grades"
            options={classGrades.map((grade) => ({
              value: String(grade),
              label: `Grade ${grade}`,
            }))}
            error={errors.grades}
          />
          <Text size="sm" c="muted">
            Every game starts on. Pick more than one grade for a split class.
          </Text>
          <ClassColourPicker value={colour} onChange={setColour} />
          {state === "failed" && (
            <Text>
              The class couldn't be made. Check your connection and try again.
            </Text>
          )}
          <div className={classes.actions}>
            <Button type="submit" tone="educator" disabled={state === "busy"}>
              Create class
            </Button>
            {onCancel && (
              <Button variant="subtle" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </Stack>
      </form>
    </Card>
  );
}

/** "Grade 4", "Grades 4 and 5", "Grades 3, 4 and 5". */
export function gradesLabel(grades: readonly number[]) {
  if (grades.length === 1) return `Grade ${grades[0]}`;
  const last = grades.at(-1);
  return `Grades ${grades.slice(0, -1).join(", ")} and ${last}`;
}

/** The class colours, as swatches: on the new-class form and Manage class. */
export function ClassColourPicker({
  value,
  onChange,
  disabled,
  hideLabel,
}: {
  value: ClassColourSlug;
  onChange(colour: ClassColourSlug): void;
  disabled?: boolean;
  /** Under a heading that already says "Class colour". */
  hideLabel?: boolean;
}) {
  return (
    <ColourPicker
      label="Class colour"
      name="colour"
      options={classColours.map((c) => ({
        value: c.slug,
        label: c.name,
        fill: c.tone.fill,
        onFill: c.tone.onFill,
      }))}
      value={value}
      onChange={(slug) => onChange(slug as ClassColourSlug)}
      disabled={disabled}
      hideLabel={hideLabel}
    />
  );
}
