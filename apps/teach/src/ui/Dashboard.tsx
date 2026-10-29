// A class's dashboard: the misconceptions showing up in the class, above its
// students against the expectations its games evidence, each cell saying how
// well that student's plays show understanding of that expectation, or that
// there's no evidence yet. A cell, or a student under a misconception, opens
// that student's evidence.
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Loader } from "@repo/ui/loader";
import { Stack } from "@repo/ui/stack";
import { Table } from "@repo/ui/table";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import { VisuallyHidden } from "@repo/ui/visually-hidden";
import { useCallback, useEffect, useState } from "react";
import type {
  Class,
  ClassMisconception,
  Dashboard,
  DashboardExpectation,
  Result,
  TeacherPort,
  Understanding,
} from "../platform/ports.ts";
import { gradesLabel } from "./Classes.tsx";
import classes from "./dashboard.module.css";

/** What each understanding band says. Descriptions, never marks or levels. */
export const understandingLabels: Record<Understanding, string> = {
  "not-yet-showing": "Not yet showing",
  developing: "Developing",
  "showing-consistently": "Showing consistently",
};

/** A student's evidence for one expectation, to open. */
export interface Cell {
  studentId: string;
  expectationId: string;
}

export function DashboardScreen({
  teacher,
  cls,
  onBack,
  onOpen,
  misconception,
  onMisconception,
}: {
  teacher: TeacherPort;
  cls: Class;
  onBack(): void;
  onOpen(cell: Cell): void;
  /** The misconception opened in the strip, as `game|id`. */
  misconception: string | null;
  onMisconception(key: string | null): void;
}) {
  const [dashboard, setDashboard] = useState<Dashboard | "loading" | "error">(
    "loading",
  );

  const load = useCallback(() => {
    setDashboard("loading");
    teacher.dashboard(cls.id).then(setDashboard, (error: unknown) => {
      console.error("[teach] Couldn't load the dashboard", error);
      setDashboard("error");
    });
  }, [teacher, cls.id]);
  useEffect(load, [load]);

  return (
    <Stack gap="lg">
      <div>
        <Button variant="subtle" onClick={onBack}>
          Your classes
        </Button>
      </div>
      <div>
        <Title order={1}>{cls.name}</Title>
        <Text c="muted">{gradesLabel(cls.grades)}</Text>
      </div>
      {dashboard === "loading" && (
        <Loader label="Loading the class's results" size="md" />
      )}
      {dashboard === "error" && (
        <Card variant="soft" tone="educator">
          <Stack gap="xs" align="flex-start">
            <Text>The class's results couldn't be loaded.</Text>
            <Button variant="secondary" onClick={load}>
              Try again
            </Button>
          </Stack>
        </Card>
      )}
      {typeof dashboard === "object" &&
        (dashboard.students.length === 0 ? (
          <Card variant="soft" tone="educator">
            <Stack gap="xs" align="flex-start">
              <Title order={2} size="h4">
                No students yet
              </Title>
              <Text>
                Share the class join link or a game link. Each student shows up
                here once they join.
              </Text>
            </Stack>
          </Card>
        ) : (
          <>
            <Strip
              misconceptions={dashboard.misconceptions}
              open={misconception}
              onToggle={onMisconception}
              onOpen={onOpen}
            />
            <Grid
              dashboard={dashboard}
              split={cls.grades.length > 1}
              onOpen={onOpen}
            />
          </>
        ))}
    </Stack>
  );
}

/** The misconceptions showing up in the class, each opening on who showed it. */
function Strip({
  misconceptions,
  open,
  onToggle,
  onOpen,
}: {
  misconceptions: ClassMisconception[];
  open: string | null;
  onToggle(key: string | null): void;
  onOpen(cell: Cell): void;
}) {
  return (
    <section aria-labelledby="misconceptions" className={classes.strip}>
      <Title order={2} size="h4" id="misconceptions">
        Misconceptions showing up
      </Title>
      {misconceptions.length === 0 ? (
        <Text c="muted">
          None yet. When a game spots a wrong idea in a student's play, it shows
          up here.
        </Text>
      ) : (
        <ul className={classes.misconceptions}>
          {misconceptions.map((m) => {
            const key = `${m.game}|${m.id}`;
            const isOpen = open === key;
            const panel = `misconception-${key}`;
            return (
              <li key={key} className={classes.misconception}>
                <button
                  type="button"
                  className={classes.misconceptionToggle}
                  aria-expanded={isOpen}
                  aria-controls={panel}
                  onClick={() => onToggle(isOpen ? null : key)}
                >
                  <span className={classes.misconceptionCount}>
                    {studentsLabel(m.students.length)}
                  </span>
                  <span className={classes.misconceptionDescription}>
                    {m.description}
                  </span>
                  <span className={classes.misconceptionGame}>
                    {m.gameName}
                  </span>
                </button>
                {isOpen && (
                  <ul
                    id={panel}
                    aria-label={`Students who showed: ${m.description}`}
                    className={classes.misconceptionStudents}
                  >
                    {m.students.map((student) => (
                      <li key={student.id}>
                        <button
                          type="button"
                          className={classes.studentLink}
                          onClick={() =>
                            onOpen({
                              studentId: student.id,
                              expectationId: student.expectation,
                            })
                          }
                        >
                          {nameOf(student)}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function studentsLabel(n: number) {
  return n === 1 ? "1 student" : `${n} students`;
}

function Grid({
  dashboard,
  split,
  onOpen,
}: {
  dashboard: Dashboard;
  split: boolean;
  onOpen(cell: Cell): void;
}) {
  const { expectations, students } = dashboard;
  return (
    <div className={classes.scroller}>
      <Table
        classNames={{ table: classes.grid, caption: classes.caption }}
        caption="How each student's plays show understanding of each expectation"
        head={[
          "Student",
          ...expectations.map((e) => (
            <span key={e.id} className={classes.expectation}>
              <span className={classes.code}>{expectationLabel(e)}</span>
              <span className={classes.description}>{e.description}</span>
            </span>
          )),
        ]}
        body={students.map((student) => ({
          key: student.id,
          cells: [
            <span key="name" className={classes.student}>
              {nameOf(student)}
              {split && student.grade !== null && (
                <span className={classes.studentGrade}>
                  Grade {student.grade}
                </span>
              )}
            </span>,
            ...expectations.map((e) => (
              <ResultCell
                key={e.id}
                result={student.results.find((r) => r.expectation === e.id)}
                label={`${nameOf(student)}, ${expectationLabel(e)}`}
                onOpen={() =>
                  onOpen({ studentId: student.id, expectationId: e.id })
                }
              />
            )),
          ],
        }))}
      />
    </div>
  );
}

/** A cell: its band, which opens the evidence behind it. */
function ResultCell({
  result,
  label,
  onOpen,
}: {
  result: Result | undefined;
  /** Whose cell, and which expectation's, for a screen reader. */
  label: string;
  onOpen(): void;
}) {
  if (!result)
    return <span className={classes.noEvidence}>No evidence yet</span>;
  return (
    <button
      type="button"
      className={classes.band}
      data-understanding={result.understanding}
      onClick={onOpen}
    >
      <Band result={result} />
      <VisuallyHidden> — {label}: see the evidence</VisuallyHidden>
    </button>
  );
}

/** A result's band in words, and the tier it's from when that isn't the student's. */
export function Band({ result }: { result: Result }) {
  return (
    <>
      {understandingLabels[result.understanding]}
      {result.otherTier && (
        <span className={classes.otherTier}>
          From the Grade {result.tierGrade} tier
        </span>
      )}
    </>
  );
}

/** "Grade 4 · B1.6" */
export function expectationLabel({ grade, code }: DashboardExpectation) {
  return `Grade ${grade} · ${code}`;
}

/** "Ada L." */
export function nameOf({
  firstName,
  lastInitial,
}: {
  firstName: string;
  lastInitial: string;
}) {
  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
}
