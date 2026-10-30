// A class's dashboard: the misconceptions showing up in the class, above its
// students against the expectations its games evidence, each cell saying how
// well that student's plays show understanding of that expectation, or that
// there's no evidence yet. A cell, or a student under a misconception, opens
// that student's page at that expectation; a student's name opens their page.
// A box above the grid narrows its rows to the students whose names match.
// Below, the students not recognised yet this term. The header has the three
// things a teacher does here: share the class, quick assess, manage it.
import { classColour } from "@repo/tokens";
import { Badge } from "@repo/ui/badge";
import { Card } from "@repo/ui/card";
import { Chevron } from "@repo/ui/chevron";
import { Collapse } from "@repo/ui/collapse";
import { DisclosureButton } from "@repo/ui/disclosure-button";
import { Icon } from "@repo/ui/icon";
import { InitialCircle } from "@repo/ui/initial-circle";
import { Stack } from "@repo/ui/stack";
import { Table } from "@repo/ui/table";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import { Tooltip } from "@repo/ui/tooltip";
import { VisuallyHidden } from "@repo/ui/visually-hidden";
import { Link } from "@tanstack/react-router";
import { type CSSProperties, type ReactNode, useState } from "react";
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
import { FindStudent, matchesName, noMatch } from "./FindStudent.tsx";
import { ButtonLink } from "./links.tsx";
import { gradesLabel } from "./NewClass.tsx";
import { expectationLabel, OfficialCode } from "./OfficialCode.tsx";
import { NotYetRecognised, type OnRecognise } from "./Recognition.tsx";
import { SectionTitle } from "./SectionTitle.tsx";
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
  const [query, setQuery] = useState("");
  const found = dashboard.students.filter((s) => matchesName(s, query));
  return (
    <Stack gap="lg">
      <Switcher classes={all} current={cls.id} />
      {/* With the panel, so the gap above it slides open too. */}
      <div>
      <div className={classes.heading}>
        <div className={classes.title}>
          <Title order={1} size="h2">
            {cls.name}
          </Title>
          <Badge tone="accent">{gradesLabel(cls.grades)}</Badge>
        </div>
        <div className={classes.actions}>
          {!cls.demo && (
            <DisclosureButton
              tone="accent"
              data-walkthrough="share"
              open={sharing}
              onToggle={() => setSharing(!sharing)}
            >
              Share
            </DisclosureButton>
          )}
          <ButtonLink
            to="/classes/$classId/quick-assess"
            params={{ classId: cls.id }}
            state={{ fromAbove: true }}
            variant="secondary"
            data-walkthrough="quick-assess"
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
      {!cls.demo && (
        <Collapse open={sharing}>
          <div className={classes.sharePanel}>
            <SharePanel cls={cls} actions={share} />
          </div>
        </Collapse>
      )}
      </div>
      {cls.demo && <DemoCard actions={demo} />}
      {dashboard.students.length === 0 ? (
        <Card variant="soft" tone="accent">
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
          <section aria-labelledby="results" className={classes.results}>
            <div className={classes.resultsTop}>
              <SectionTitle id="results" icon="grid">
                Students
              </SectionTitle>
              <div className={classes.resultsTools}>
                <BandsKey />
                <FindStudent
                  query={query}
                  onQuery={setQuery}
                  hideLabel
                  className={classes.find}
                />
              </div>
            </div>
            {found.length === 0 ? (
              <Text className={classes.noMatch}>{noMatch(query)}</Text>
            ) : (
              <Grid
                classId={cls.id}
                expectations={dashboard.expectations}
                students={found}
                split={cls.grades.length > 1}
              />
            )}
          </section>
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
    <nav
      aria-label="Your classes"
      className={classes.switcher}
      data-walkthrough="classes"
    >
      {all.map((c) => {
        const colour = classColour(c.colour);
        return (
          <Link
            key={c.id}
            to="/classes/$classId"
            params={{ classId: c.id }}
            aria-current={c.id === current ? "page" : undefined}
            aria-describedby={`switch-${c.id}`}
            className={classes.switch}
            data-class-colour={colour.slug}
            style={
              {
                "--switch-fill": colour.tone.fill,
                "--switch-on-fill": colour.tone.onFill,
              } as CSSProperties
            }
          >
            <span className={classes.dot} aria-hidden="true" />
            {c.name}
          </Link>
        );
      })}
      <Link to="/new" className={classes.switch} data-walkthrough="new-class">
        <Icon name="plus" size={16} />
        New class
      </Link>
      {/* Each class's colour, for a screen reader, beside its name. */}
      <VisuallyHidden>
        {all.map((c) => (
          <span key={c.id} id={`switch-${c.id}`}>
            {`Class colour: ${classColour(c.colour).name}`}
          </span>
        ))}
      </VisuallyHidden>
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
  "data-walkthrough"?: string;
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
    <section
      aria-labelledby="misconceptions"
      className={`${classes.card} ${classes.strip}`}
      data-walkthrough="misconceptions"
    >
      <SectionTitle id="misconceptions" icon="idea" tone="misconception">
        Misconceptions showing up
      </SectionTitle>
      {misconceptions.length === 0 ? (
        <Text c="muted">None yet.</Text>
      ) : (
        <ul className={classes.misconceptions}>
          {shown.map((m, index) => {
            const key = `${m.game}|${m.id}`;
            const isOpen = open === key;
            const panel = `misconception-${key}`;
            return (
              <li
                key={key}
                className={classes.misconception}
                data-arriving={
                  (all && !hidden && index >= commonMisconceptions) ||
                  undefined
                }
              >
                <button
                  type="button"
                  className={classes.misconceptionToggle}
                  aria-expanded={isOpen}
                  aria-controls={panel}
                  onClick={() => onToggle(isOpen ? null : key)}
                >
                  <span className={classes.misconceptionHead}>
                    <span className={classes.misconceptionCount}>
                      {studentsLabel(m.students.length)}
                    </span>
                    <Chevron open={isOpen} className={classes.chevron} />
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
                <Collapse open={isOpen} id={panel}>
                  <ul
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
                </Collapse>
              </li>
            );
          })}
        </ul>
      )}
      {misconceptions.length > commonMisconceptions && !hidden && (
        <div>
          <DisclosureButton
            variant="subtle"
            open={all}
            onToggle={() => setAll(!all)}
          >
            {all
              ? "Show the most common"
              : `All ${misconceptions.length} misconceptions`}
          </DisclosureButton>
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
  expectations,
  students,
  split,
}: {
  classId: string;
  expectations: Dashboard["expectations"];
  /** The students shown: all of them, or those the search found. */
  students: Dashboard["students"];
  split: boolean;
}) {
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
              <InitialCircle
                id={student.id}
                name={student.firstName}
                size="sm"
              />
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

/** What each band's shade means, above the grid. */
function BandsKey() {
  return (
    <ul className={classes.key} aria-label="Key">
      {(Object.keys(understandingLabels) as Understanding[]).map((u) => (
        <li key={u}>
          <span
            className={classes.swatch}
            data-understanding={u}
            aria-hidden="true"
          />
          {understandingLabels[u]}
        </li>
      ))}
    </ul>
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
      data-walkthrough="result"
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
          At the Grade {result.tierGrade} level
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
