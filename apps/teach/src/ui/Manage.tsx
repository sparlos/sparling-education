// Managing a class: turning its games on and off, changing a student's
// grade in a split class, and removing a student. Each change takes effect
// at once.
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { RadioGroup } from "@repo/ui/radio-group";
import { Stack } from "@repo/ui/stack";
import { Switch } from "@repo/ui/switch";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import { VisuallyHidden } from "@repo/ui/visually-hidden";
import { useState } from "react";
import type {
  Class,
  ClassGame,
  ClassGrade,
  ClassStudent,
} from "../platform/ports.ts";
import { gradesLabel } from "./Classes.tsx";
import { nameOf } from "./Dashboard.tsx";
import { ButtonLink, useUp } from "./links.tsx";
import classes from "./manage.module.css";

/** The changes a teacher can make; each resolves once the screen shows it. */
export interface ManageActions {
  switchGame(slug: string, on: boolean): Promise<void>;
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
          The class's results
        </ButtonLink>
      </div>
      <div>
        <Title order={1}>Manage {cls.name}</Title>
        <Text c="muted">{gradesLabel(cls.grades)}</Text>
      </div>
      <Games games={cls.games} onSwitch={actions.switchGame} />
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

function Games({
  games,
  onSwitch,
}: {
  games: ClassGame[];
  onSwitch(slug: string, on: boolean): Promise<void>;
}) {
  return (
    <Card padding="lg">
      <section aria-labelledby="games">
        <Stack gap="md">
          <div>
            <Title order={2} size="h3" id="games">
              Games
            </Title>
            <Text size="sm" c="muted">
              Students see the games that are on in their locker.
            </Text>
          </div>
          <ul className={classes.list}>
            {games.map((game) => (
              <GameSwitch key={game.slug} game={game} onSwitch={onSwitch} />
            ))}
          </ul>
        </Stack>
      </section>
    </Card>
  );
}

function GameSwitch({
  game,
  onSwitch,
}: {
  game: ClassGame;
  onSwitch(slug: string, on: boolean): Promise<void>;
}) {
  const { busy, failed, run } = useChange();
  return (
    <li>
      <Switch
        tone="educator"
        label={game.name}
        description={
          game.on
            ? "On: in your students' lockers."
            : "Off: not in their lockers, and its game link says it's turned off."
        }
        checked={game.on}
        disabled={busy}
        onChange={(on) => run(() => onSwitch(game.slug, on))}
      />
      {failed && <Text size="sm">{unsaved}</Text>}
    </li>
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
          <div>
            <Title order={2} size="h3" id="students">
              Students
            </Title>
            {cls.grades.length > 1 && (
              <Text size="sm" c="muted">
                Students pick their grade when they join. Change it if one
                picked the wrong grade: it sets the tier of the games they play
                next, and results they already have keep their tier.
              </Text>
            )}
          </div>
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
    <li className={classes.student} aria-label={name}>
      <div className={classes.row}>
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
        {opened === "none" && (
          <div className={classes.controls}>
            {split && (
              <Button variant="secondary" onClick={() => open("grade")}>
                {student.grade === null ? "Set grade" : "Change grade"}{" "}
                <VisuallyHidden>for {name}</VisuallyHidden>
              </Button>
            )}
            <Button variant="secondary" onClick={() => open("remove")}>
              Remove <VisuallyHidden>{name}</VisuallyHidden>
            </Button>
          </div>
        )}
      </div>
      {changed !== null && (
        <Text size="sm" aria-live="polite">
          {name} now plays at the Grade {changed} tier. Results they already
          have keep their tier.
        </Text>
      )}
      {opened === "grade" && (
        <Card variant="soft" tone="educator">
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
              Their next plays are at this grade's tier. Results they already
              have keep the tier they were earned at.
            </Text>
            <div className={classes.controls}>
              <Button tone="educator" disabled={busy} onClick={save}>
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
        <Card variant="soft" tone="educator">
          <Stack gap="sm" align="flex-start">
            <Text>
              Remove {name} from {cls.name}? The class leaves their locker, and
              their results leave your views of it.
            </Text>
            <div className={classes.controls}>
              <Button
                tone="educator"
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
