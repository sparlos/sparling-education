// A class's dashboard: the misconceptions showing up in the class, above its
// students against the expectations its games evidence, each cell saying how
// well that student's plays show understanding of that expectation, or that
// there's no evidence yet. A cell, or a student under a misconception, opens
// that student's page at that expectation; a student's name opens their page.
// Below, the students not recognised yet this term. The header has the three
// things a teacher does here: share the class, quick assess, manage it.
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Stack } from "@repo/ui/stack";
import { Table } from "@repo/ui/table";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import { Tooltip } from "@repo/ui/tooltip";
import { VisuallyHidden } from "@repo/ui/visually-hidden";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import type {
  Class,
  ClassMisconception,
  Dashboard,
  DashboardExpectation,
  Result,
  Understanding,
} from "../platform/ports.ts";
import { type DemoActions, DemoCard } from "./Demo.tsx";
import classes from "./dashboard.module.css";
import { ButtonLink } from "./links.tsx";
import { gradesLabel } from "./NewClass.tsx";
import { expectationLabel, OfficialCode } from "./OfficialCode.tsx";
import { NotYetRecognised, type OnRecognise } from "./Recognition.tsx";
import { type ShareActions, SharePanel } from "./Share.tsx";

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
  onRecognise,
  demo,
  share,
}: {
  cls: Class;
  /** All the teacher's classes, to switch between. */
  classes: Class[];
  dashboard: Dashboard;
  /** The misconception opened in the strip, as `game|id`. */
  misconception: string | null;
  onMisconception(key: string | null): void;
  onRecognise: OnRecognise;
  /** What can be done with the demo class, on its dashboard. */
  demo: DemoActions;
  share: ShareActions;
}) {
  const [sharing, setSharing] = useState(false);
  return (
    <Stack gap="md">
      <Switcher classes={all} current={cls.id} />
      <div className={classes.heading}>
        <div className={classes.title}>
          <Title order={1} size="h2">
            {cls.name}
          </Title>
          <Text c="muted">{gradesLabel(cls.grades)}</Text>
        </div>
        <div className={classes.actions}>
          {!cls.demo && (
            <Button
              tone="educator"
              aria-expanded={sharing}
              onClick={() => setSharing(!sharing)}
            >
              Share
            </Button>
          )}
          <ButtonLink
            to="/classes/$classId/quick-assess"
            params={{ classId: cls.id }}
            state={{ fromAbove: true }}
            variant="secondary"
          >
            Quick assess
          </ButtonLink>
          <ButtonLink
            to="/classes/$classId/manage"
            params={{ classId: cls.id }}
            state={{ fromAbove: true }}
            variant="secondary"
          >
            Manage class
          </ButtonLink>
        </div>
      </div>
      {sharing && !cls.demo && <SharePanel cls={cls} actions={share} />}
      {cls.demo && <DemoCard actions={demo} />}
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
            showGame={cls.games.length > 1}
            open={misconception}
            onToggle={onMisconception}
          />
          <Grid
            classId={cls.id}
            dashboard={dashboard}
            split={cls.grades.length > 1}
          />
          <NotYetRecognised
            students={dashboard.students}
            settings={dashboard.recognition}
            onRecognise={onRecognise}
          />
        </>
      )}
    </Stack>
  );
}

/** The teacher's classes, the one shown marked, and the way to make another. */
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
      <Link to="/new" className={classes.switch}>
        New class
      </Link>
    </nav>
  );
}

/** A link down to a student's page, at one expectation's plays. */
export function EvidenceLink({
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
      to="/classes/$classId/students/$studentId"
      params={{ classId, studentId: cell.studentId }}
      search={{ expectation: cell.expectationId }}
      state={{ fromAbove: true }}
      className={className}
      {...data}
    >
      {children}
    </Link>
  );
}

/** The misconceptions showing up in the class, each opening on who showed it. */
export function Strip({
  classId,
  misconceptions,
  showGame,
  open,
  onToggle,
}: {
  classId: string;
  misconceptions: ClassMisconception[];
  /** Name each one's game: only when the class has more than one. */
  showGame: boolean;
  open: string | null;
  onToggle(key: string | null): void;
}) {
  const [all, setAll] = useState(false);
  // One opened from a link is never hidden behind "All".
  const hidden = misconceptions
    .slice(commonMisconceptions)
    .some((m) => `${m.game}|${m.id}` === open);
  const shown =
    all || hidden
      ? misconceptions
      : misconceptions.slice(0, commonMisconceptions);
  return (
    <section aria-labelledby="misconceptions" className={classes.strip}>
      <Title order={2} size="h4" id="misconceptions">
        Misconceptions showing up
      </Title>
      {misconceptions.length === 0 ? (
        <Text c="muted">None yet.</Text>
      ) : (
        <ul className={classes.misconceptions}>
          {shown.map((m) => {
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
                  {showGame && (
                    <span className={classes.misconceptionGame}>
                      {m.gameName}
                    </span>
                  )}
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
      {misconceptions.length > commonMisconceptions && !hidden && (
        <div>
          <Button
            variant="subtle"
            aria-expanded={all}
            onClick={() => setAll(!all)}
          >
            {all
              ? "Show the most common"
              : `All ${misconceptions.length} misconceptions`}
          </Button>
        </div>
      )}
    </section>
  );
}

/** How many misconceptions the strip shows before "All". */
const commonMisconceptions = 3;

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
        caption={
          <VisuallyHidden>
            How each student's plays show understanding of each expectation
          </VisuallyHidden>
        }
        head={[
          "Student",
          ...expectations.map((e) => (
            <span key={e.id} className={classes.expectation}>
              <OfficialCode
                expectation={e}
                className={classes.code}
                label={shortCode(e)}
              />
              <Tooltip label={e.description}>
                <span className={classes.description}>
                  {shortLabel(e.description)}
                </span>
              </Tooltip>
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

/** "Gr 4 · B1.6", for a column header. */
function shortCode({ grade, code }: DashboardExpectation) {
  return `Gr ${grade} · ${code}`;
}

/** An expectation's first few words: enough to tell its columns apart. */
export function shortLabel(description: string) {
  const words = description.replace(/[,:;.]$/, "").split(" ");
  return words.length <= 4 ? description : `${words.slice(0, 4).join(" ")}…`;
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
