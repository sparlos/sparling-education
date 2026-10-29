// A class's dashboard: the misconceptions showing up in the class, above its
// students against the expectations its games evidence, each cell saying how
// well that student's plays show understanding of that expectation, or that
// there's no evidence yet. A cell, or a student under a misconception, opens
// that student's evidence; a student's name opens their page.
import { Card } from "@repo/ui/card";
import { Stack } from "@repo/ui/stack";
import { Table } from "@repo/ui/table";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import { VisuallyHidden } from "@repo/ui/visually-hidden";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type {
  Class,
  ClassMisconception,
  Dashboard,
  DashboardExpectation,
  Result,
  Understanding,
} from "../platform/ports.ts";
import { gradesLabel } from "./Classes.tsx";
import classes from "./dashboard.module.css";
import { ButtonLink, useUp } from "./links.tsx";

/** What each understanding band says. Descriptions, never marks or levels. */
export const understandingLabels: Record<Understanding, string> = {
  "not-yet-showing": "Not yet showing",
  developing: "Developing",
  "showing-consistently": "Showing consistently",
};

/** A student's evidence for one expectation, to open. */
interface Cell {
  studentId: string;
  expectationId: string;
}

export function DashboardScreen({
  cls,
  classes: all,
  dashboard,
  misconception,
  onMisconception,
}: {
  cls: Class;
  /** All the teacher's classes, to switch between. */
  classes: Class[];
  dashboard: Dashboard;
  /** The misconception opened in the strip, as `game|id`. */
  misconception: string | null;
  onMisconception(key: string | null): void;
}) {
  const up = useUp();
  return (
    <Stack gap="lg">
      <div>
        <ButtonLink to="/" variant="subtle" onClick={up}>
          Your classes
        </ButtonLink>
      </div>
      {all.length > 1 && <Switcher classes={all} current={cls.id} />}
      <div className={classes.heading}>
        <div>
          <Title order={1}>{cls.name}</Title>
          <Text c="muted">{gradesLabel(cls.grades)}</Text>
        </div>
        <ButtonLink
          to="/classes/$classId/manage"
          params={{ classId: cls.id }}
          state={{ fromAbove: true }}
          variant="secondary"
        >
          Manage class
        </ButtonLink>
      </div>
      {dashboard.students.length === 0 ? (
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
            classId={cls.id}
            misconceptions={dashboard.misconceptions}
            open={misconception}
            onToggle={onMisconception}
          />
          <Grid
            classId={cls.id}
            dashboard={dashboard}
            split={cls.grades.length > 1}
          />
        </>
      )}
    </Stack>
  );
}

/** The teacher's other classes, one tap away: the dashboard shows one at a time. */
function Switcher({
  classes: all,
  current,
}: {
  classes: Class[];
  current: string;
}) {
  return (
    <nav aria-label="Your classes" className={classes.switcher}>
      {all.map((c) => (
        <Link
          key={c.id}
          to="/classes/$classId"
          params={{ classId: c.id }}
          aria-current={c.id === current ? "page" : undefined}
          className={classes.switch}
        >
          {c.name}
        </Link>
      ))}
    </nav>
  );
}

/** A link down to a student's evidence for one expectation. */
function EvidenceLink({
  classId,
  cell,
  className,
  children,
  ...data
}: {
  classId: string;
  cell: Cell;
  className?: string;
  children: ReactNode;
  "data-understanding"?: Understanding;
}) {
  return (
    <Link
      to="/classes/$classId/students/$studentId/expectations/$expectationId"
      params={{ classId, ...cell }}
      state={{ fromAbove: true }}
      className={className}
      {...data}
    >
      {children}
    </Link>
  );
}

/** The misconceptions showing up in the class, each opening on who showed it. */
function Strip({
  classId,
  misconceptions,
  open,
  onToggle,
}: {
  classId: string;
  misconceptions: ClassMisconception[];
  open: string | null;
  onToggle(key: string | null): void;
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
                        <EvidenceLink
                          classId={classId}
                          cell={{
                            studentId: student.id,
                            expectationId: student.expectation,
                          }}
                          className={classes.studentLink}
                        >
                          {nameOf(student)}
                        </EvidenceLink>
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
  classId,
  dashboard,
  split,
}: {
  classId: string;
  dashboard: Dashboard;
  split: boolean;
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
              <Link
                to="/classes/$classId/students/$studentId"
                params={{ classId, studentId: student.id }}
                state={{ fromAbove: true }}
                className={classes.studentName}
              >
                {nameOf(student)}
              </Link>
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
                classId={classId}
                cell={{ studentId: student.id, expectationId: e.id }}
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
  classId,
  cell,
}: {
  result: Result | undefined;
  /** Whose cell, and which expectation's, for a screen reader. */
  label: string;
  classId: string;
  cell: Cell;
}) {
  if (!result)
    return <span className={classes.noEvidence}>No evidence yet</span>;
  return (
    <EvidenceLink
      classId={classId}
      cell={cell}
      className={classes.band}
      data-understanding={result.understanding}
    >
      <Band result={result} />
      <VisuallyHidden> — {label}: see the evidence</VisuallyHidden>
    </EvidenceLink>
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
