// Managing a class: its colour, and its students (changing a student's grade
// in a split class, and removing a student). Each change takes effect at once.
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { InitialCircle } from "@repo/ui/initial-circle";
import { Menu } from "@repo/ui/menu";
import { RadioGroup } from "@repo/ui/radio-group";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import { VisuallyHidden } from "@repo/ui/visually-hidden";
import { useState } from "react";
import type {
  Class,
  ClassColourSlug,
  ClassGrade,
  ClassStudent,
} from "../platform/ports.ts";
import { nameOf } from "./Dashboard.tsx";
import { ButtonLink, useUp } from "./links.tsx";
import classes from "./manage.module.css";
import { ClassColourPicker, gradesLabel } from "./NewClass.tsx";
import { SectionTitle } from "./SectionTitle.tsx";

/** The changes a teacher can make; each resolves once the screen shows it. */
export interface ManageActions {
  setColour(colour: ClassColourSlug): Promise<void>;
  setGrade(studentId: string, grade: ClassGrade): Promise<void>;
  remove(studentId: string): Promise<void>;
}

export function ManageScreen({
  cls,
  students,
  actions,
}: {
  cls: Class;
  students: ClassStudent[];
  actions: ManageActions;
}) {
  const up = useUp();
  return (
    <Stack gap="lg">
      <div>
        <ButtonLink
          to="/classes/$classId"
          params={{ classId: cls.id }}
          variant="subtle"
          onClick={up}
        >
          {cls.name}
        </ButtonLink>
      </div>
      <div>
        <Title order={1}>Manage {cls.name}</Title>
        <Text c="muted">{gradesLabel(cls.grades)}</Text>
      </div>
      <Colour cls={cls} actions={actions} />
      <Students cls={cls} students={students} actions={actions} />
    </Stack>
  );
}

/** What a change that didn't go through says. */
const unsaved = "That didn't save. Check your connection and try again.";

/** Runs a change, keeping whether it's under way or failed. */
function useChange() {
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");
  const run = (change: () => Promise<void>, done?: () => void) => {
    setState("busy");
    change().then(
      () => {
        setState("idle");
        done?.();
      },
      (error: unknown) => {
        console.error("[teach] Couldn't change the class", error);
        setState("failed");
      },
    );
  };
  return { busy: state === "busy", failed: state === "failed", run };
}

/** The class's colour: every screen for the class takes it, at once. */
function Colour({ cls, actions }: { cls: Class; actions: ManageActions }) {
  const { busy, failed, run } = useChange();
  return (
    <Card padding="lg">
      <section aria-labelledby="colour">
        <Stack gap="md">
          <SectionTitle id="colour" icon="create">
            Class colour
          </SectionTitle>
          <ClassColourPicker
            value={cls.colour}
            disabled={busy}
            hideLabel
            onChange={(colour) => run(() => actions.setColour(colour))}
          />
          {failed && <Text size="sm">{unsaved}</Text>}
        </Stack>
      </section>
    </Card>
  );
}

function Students({
  cls,
  students,
  actions,
}: {
  cls: Class;
  students: ClassStudent[];
  actions: ManageActions;
}) {
  return (
    <Card padding="lg">
      <section aria-labelledby="students">
        <Stack gap="md">
          <SectionTitle id="students" icon="users">
            Students
          </SectionTitle>
          {students.length === 0 ? (
            <Text c="muted">
              No students yet. Each student shows up here once they join.
            </Text>
          ) : (
            <ul className={classes.list}>
              {students.map((student) => (
                <StudentRow
                  key={student.id}
                  cls={cls}
                  student={student}
                  actions={actions}
                />
              ))}
            </ul>
          )}
        </Stack>
      </section>
    </Card>
  );
}

/** What a student's row has open: nothing, a grade to pick, or removing them. */
type Opened = "none" | "grade" | "remove";

function StudentRow({
  cls,
  student,
  actions,
}: {
  cls: Class;
  student: ClassStudent;
  actions: ManageActions;
}) {
  const [opened, setOpened] = useState<Opened>("none");
  const [picked, setPicked] = useState<string | null>(null);
  const [changed, setChanged] = useState<number | null>(null);
  const { busy, failed, run } = useChange();
  const name = nameOf(student);
  const split = cls.grades.length > 1;

  const open = (what: Opened) => {
    setOpened(what);
    setChanged(null);
    setPicked(student.grade === null ? null : String(student.grade));
  };

  const save = () => {
    const grade = Number(picked) as ClassGrade;
    if (!picked || grade === student.grade) return setOpened("none");
    run(
      () => actions.setGrade(student.id, grade),
      () => {
        setOpened("none");
        setChanged(grade);
      },
    );
  };

  return (
    <li
      className={classes.student}
      aria-label={name}
      data-walkthrough="student"
    >
      <div className={classes.row}>
        <div className={classes.who}>
          <InitialCircle id={student.id} name={student.firstName} />
          <div>
            <Text className={classes.name}>{name}</Text>
            {split && (
              <Text size="sm" c="muted">
                {student.grade === null
                  ? "No grade picked yet"
                  : `Grade ${student.grade}`}
              </Text>
            )}
          </div>
        </div>
        {opened === "none" && (
          <Menu
            label={name}
            items={[
              ...(split
                ? [
                    {
                      key: "grade",
                      label:
                        student.grade === null ? "Set grade" : "Change grade",
                      onClick: () => open("grade"),
                    },
                  ]
                : []),
              {
                key: "remove",
                label: "Remove from class",
                onClick: () => open("remove"),
              },
            ]}
          >
            <span aria-hidden="true">⋯</span>
            <VisuallyHidden>Options for {name}</VisuallyHidden>
          </Menu>
        )}
      </div>
      {changed !== null && (
        <Text size="sm" aria-live="polite">
          {name} now plays at the Grade {changed} tier.
        </Text>
      )}
      {opened === "grade" && (
        <Card variant="soft" tone="accent">
          <Stack gap="sm" align="flex-start">
            <RadioGroup
              label={`${name}'s grade in ${cls.name}`}
              name={`grade-${student.id}`}
              options={cls.grades.map((grade) => ({
                value: String(grade),
                label: `Grade ${grade}`,
              }))}
              value={picked}
              onChange={setPicked}
            />
            <Text size="sm" c="muted">
              Students pick their grade when they join. Their next plays are at
              this grade's tier; results they already have keep theirs.
            </Text>
            <div className={classes.controls}>
              <Button tone="accent" disabled={busy} onClick={save}>
                Save grade
              </Button>
              <Button variant="subtle" onClick={() => setOpened("none")}>
                Cancel
              </Button>
            </div>
          </Stack>
        </Card>
      )}
      {opened === "remove" && (
        <Card variant="soft" tone="accent">
          <Stack gap="sm" align="flex-start">
            <Text>
              Remove {name} from {cls.name}? The class leaves their home screen, and
              their results leave your views of it.
            </Text>
            <div className={classes.controls}>
              <Button
                tone="accent"
                disabled={busy}
                onClick={() => run(() => actions.remove(student.id))}
              >
                Remove from class
              </Button>
              <Button variant="subtle" onClick={() => setOpened("none")}>
                Cancel
              </Button>
            </div>
          </Stack>
        </Card>
      )}
      {failed && <Text size="sm">{unsaved}</Text>}
    </li>
  );
}
