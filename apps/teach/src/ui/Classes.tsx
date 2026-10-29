// The "your classes" screen: the teacher's classes, making a new one, and
// copying the links to share with students.
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { CheckboxGroup } from "@repo/ui/checkbox-group";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { TextInput } from "@repo/ui/text-input";
import { Title } from "@repo/ui/title";
import { VisuallyHidden } from "@repo/ui/visually-hidden";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import {
  type Class,
  type ClassGrade,
  classGrades,
  classNameMaxLength,
  type NewClass,
} from "../platform/ports.ts";
import classes from "./classes.module.css";
import { ButtonLink } from "./links.tsx";

export function ClassesScreen({
  list,
  onCreate,
}: {
  list: Class[];
  /** Makes the class, and resolves once it's in the list. */
  onCreate(draft: NewClass): Promise<void>;
}) {
  const [creating, setCreating] = useState(false);

  const create = async (draft: NewClass) => {
    await onCreate(draft);
    setCreating(false);
  };

  return (
    <Stack gap="lg">
      <div className={classes.heading}>
        <Title order={1}>Your classes</Title>
        {list.length > 0 && !creating && (
          <Button tone="educator" onClick={() => setCreating(true)}>
            New class
          </Button>
        )}
      </div>
      {creating && (
        <NewClassForm onCreate={create} onCancel={() => setCreating(false)} />
      )}
      {list.length === 0 && !creating && (
        <Card variant="soft" tone="educator">
          <Stack gap="sm" align="flex-start">
            <Title order={2} size="h4">
              No classes yet
            </Title>
            <Text>
              Make a class to get the links your students use to join it and
              play.
            </Text>
            <Button tone="educator" onClick={() => setCreating(true)}>
              New class
            </Button>
          </Stack>
        </Card>
      )}
      {list.map((c) => (
        <ClassCard key={c.id} cls={c} />
      ))}
    </Stack>
  );
}

function NewClassForm({
  onCreate,
  onCancel,
}: {
  onCreate(draft: NewClass): Promise<void>;
  onCancel(): void;
}) {
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
    onCreate({ name, grades }).catch((error: unknown) => {
      console.error("[teach] Couldn't make a class", error);
      setState("failed");
    });
  }

  return (
    <Card>
      <form onSubmit={submit} noValidate aria-label="New class">
        <Stack gap="md">
          <Title order={2} size="h3">
            New class
          </Title>
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
          {state === "failed" && (
            <Text>
              The class couldn't be made. Check your connection and try again.
            </Text>
          )}
          <div className={classes.actions}>
            <Button type="submit" tone="educator" disabled={state === "busy"}>
              Create class
            </Button>
            <Button variant="subtle" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </Stack>
      </form>
    </Card>
  );
}

function ClassCard({ cls }: { cls: Class }) {
  const games = cls.games.filter((game) => game.on);
  return (
    <Card padding="lg">
      <section aria-label={cls.name}>
        <Stack gap="md">
          <div className={classes.linkRow}>
            <div>
              <Title order={2} size="h3">
                {cls.name}
              </Title>
              <Text c="muted">{gradesLabel(cls.grades)}</Text>
            </div>
            <div className={classes.actions}>
              <ButtonLink
                to="/classes/$classId/manage"
                params={{ classId: cls.id }}
                variant="secondary"
              >
                Manage <VisuallyHidden>{cls.name}</VisuallyHidden>
              </ButtonLink>
              <ButtonLink
                to="/classes/$classId"
                params={{ classId: cls.id }}
                state={{ fromAbove: true }}
                tone="educator"
              >
                See results <VisuallyHidden>for {cls.name}</VisuallyHidden>
              </ButtonLink>
            </div>
          </div>
          <div className={classes.linkRow}>
            <div className={classes.linkText}>
              <Text>Class join link</Text>
              <Text size="sm" c="muted" className={classes.url}>
                {cls.joinLink}
              </Text>
            </div>
            <CopyButton text={cls.joinLink}>Copy join link</CopyButton>
          </div>
          <Stack gap="xs">
            <Title order={3} size="h5">
              Game links
            </Title>
            <Text size="sm" c="muted">
              Each one opens its game for this class, joining students who
              aren't in it yet.
            </Text>
            <ul className={classes.games}>
              {games.map((game) => (
                <li key={game.slug} className={classes.linkRow}>
                  <Text>{game.name}</Text>
                  <CopyButton text={game.link}>
                    Copy game link{" "}
                    <VisuallyHidden>for {game.name}</VisuallyHidden>
                  </CopyButton>
                </li>
              ))}
            </ul>
          </Stack>
        </Stack>
      </section>
    </Card>
  );
}

function CopyButton({ text, children }: { text: string; children: ReactNode }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = () => {
    navigator.clipboard.writeText(text).then(
      () => setState("copied"),
      (error: unknown) => {
        console.error("[teach] Couldn't copy a link", error);
        setState("failed");
      },
    );
  };

  return (
    <Button variant="secondary" onClick={copy}>
      <span aria-live="polite">
        {state === "copied"
          ? "Copied"
          : state === "failed"
            ? "Couldn't copy"
            : children}
      </span>
    </Button>
  );
}

/** "Grade 4", "Grades 4 and 5", "Grades 3, 4 and 5". */
export function gradesLabel(grades: readonly number[]) {
  if (grades.length === 1) return `Grade ${grades[0]}`;
  const last = grades.at(-1);
  return `Grades ${grades.slice(0, -1).join(", ")} and ${last}`;
}
