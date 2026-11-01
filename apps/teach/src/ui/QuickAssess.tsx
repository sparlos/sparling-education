// Quick assess, for writing report cards, laid out the way one is written:
// for each student, what their plays show for each expectation, the next
// steps those plays point to, and their Learning Skills, which report cards
// keep apart from the math grade. Counts only, never a level, rating or mark:
// the grade is the teacher's. On screen it's one student at a time, as report
// cards are written: the class's names beside them, found by typing, and
// previous and next (or the arrow keys) to go through the class. Made to
// print every student: the navigation goes, a student stays on one page where
// they fit, and every page's header names the class and the date.
import { brandName } from "@repo/tokens";
import { Accordion } from "@repo/ui/accordion";
import { Button } from "@repo/ui/button";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type {
  Class,
  QuickAssessExpectation,
  QuickAssessStudent,
} from "../platform/ports.ts";
import { nameOf } from "./Dashboard.tsx";
import { effortLabels, withEvidence } from "./effort.ts";
import { FindStudent, matchesName, noMatch } from "./FindStudent.tsx";
import { ButtonLink, useUp } from "./links.tsx";
import { expectationLabel, OfficialCode } from "./OfficialCode.tsx";
import classes from "./quick-assess.module.css";
import { SectionTitle } from "./SectionTitle.tsx";

export function ClassQuickAssessScreen({
  cls,
  students,
  shown: shownId,
  onShow,
  today,
}: {
  cls: Class;
  students: QuickAssessStudent[];
  /** The student shown on screen; the first when null or not in the class. */
  shown: string | null;
  onShow(studentId: string): void;
  /** The date it's printed on. */
  today: Date;
}) {
  const up = useUp();
  const date = today.toLocaleDateString("en-CA", { dateStyle: "long" });
  // Saving as a PDF names the file after the page's title.
  useEffect(() => {
    const before = document.title;
    document.title = `Quick assess, ${cls.name}, ${date}`;
    return () => {
      document.title = before;
    };
  }, [cls.name, date]);

  const [query, setQuery] = useState("");
  const found = students.filter(({ student }) => matchesName(student, query));
  const index = Math.max(
    0,
    students.findIndex(({ student }) => student.id === shownId),
  );
  const shown = students[index];
  const step = (by: -1 | 1) => {
    const next = students[index + by];
    if (next) onShow(next.student.id);
  };

  // The arrow keys go through the class, except while typing or in a dialog,
  // such as the walkthrough, which has arrow keys of its own.
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        (event.target instanceof HTMLElement &&
          event.target.closest(
            "input, textarea, select, [contenteditable], [role=dialog]",
          ))
      )
        return;
      if (event.key === "ArrowLeft") stepRef.current(-1);
      else if (event.key === "ArrowRight") stepRef.current(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // On a phone the names are above: picking one brings its student into view.
  const shownRef = useRef<HTMLDivElement>(null);
  const pick = (studentId: string) => {
    onShow(studentId);
    shownRef.current?.scrollIntoView?.({ block: "nearest" });
  };

  return (
    <Stack gap="lg">
      <div className={classes.screenOnly}>
        <ButtonLink
          to="/classes/$classId"
          params={{ classId: cls.id }}
          variant="subtle"
          onClick={up}
        >
          {cls.name}
        </ButtonLink>
      </div>
      <div className={classes.heading}>
        <div>
          <Title order={1}>Quick assess</Title>
          <Text>{cls.name}</Text>
          <Text c="muted">{date}</Text>
        </div>
        <Button
          variant="secondary"
          className={classes.screenOnly}
          data-walkthrough="print"
          onClick={() => window.print()}
        >
          Print
        </Button>
      </div>
      <Text className={classes.note}>
        What your students' games show so far. Use it with what you see in class
        when you write report cards. {brandName} never gives a level: you decide
        the grade.
      </Text>
      {!shown ? (
        <Text>Your students show up here once they join.</Text>
      ) : (
        <div className={classes.scan}>
          <nav
            aria-label="Students"
            className={`${classes.roster} ${classes.screenOnly}`}
            data-walkthrough="students"
          >
            <FindStudent query={query} onQuery={setQuery} />
            {found.length === 0 ? (
              <Text>{noMatch(query)}</Text>
            ) : (
              <ul className={classes.names}>
                {found.map(({ student }) => (
                  <li key={student.id}>
                    <button
                      type="button"
                      className={classes.pick}
                      aria-current={
                        student.id === shown.student.id ? "true" : undefined
                      }
                      onClick={() => pick(student.id)}
                    >
                      {nameOf(student)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>
          <div ref={shownRef} className={classes.shown}>
            <div
              className={`${classes.stepper} ${classes.screenOnly}`}
              data-walkthrough="stepper"
            >
              <Button
                variant="secondary"
                disabled={index === 0}
                onClick={() => step(-1)}
              >
                ‹ Previous
              </Button>
              <Text c="muted">{`${index + 1} of ${students.length}`}</Text>
              <Button
                variant="secondary"
                disabled={index === students.length - 1}
                onClick={() => step(1)}
              >
                Next ›
              </Button>
            </div>
            {/* A table only so the header repeats on every printed page. */}
            <table className={classes.pages} role="presentation">
              <thead aria-hidden="true">
                <tr>
                  <td className={classes.pageHeader}>
                    {`Quick assess · ${cls.name} · ${date}`}
                  </td>
                </tr>
              </thead>
              <tbody>
                {students.map((assessed) => (
                  <tr
                    key={assessed.student.id}
                    // Every student prints; only the one shown is on screen.
                    className={
                      assessed === shown ? undefined : classes.printOnlyRow
                    }
                  >
                    <td
                      data-walkthrough={
                        assessed === shown ? "assessed" : undefined
                      }
                    >
                      <StudentBlock assessed={assessed} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Stack>
  );
}

export function StudentBlock({
  assessed: { student, expectations, nextSteps, learningSkills },
  named = true,
  opening,
  aside,
}: {
  assessed: QuickAssessStudent;
  /** Whether the block names its student: not on their own page. */
  named?: boolean;
  /** On screen, each expectation opens, e.g. on its plays. */
  opening?: {
    /** The open expectation. */
    open: string | null;
    onOpen(expectationId: string | null): void;
    /** Shown beside an expectation's lines, on screen only. */
    summary(expectationId: string): ReactNode;
    panel(expectationId: string): ReactNode;
  };
  /** On screen, after the rest, e.g. recognising the student. */
  aside?: ReactNode;
}) {
  const id = `student-${student.id}`;
  const part = (name: string) => `${id}-${name}`;
  return (
    <section
      aria-labelledby={named ? id : undefined}
      className={named ? classes.student : classes.bare}
    >
      {named && (
        <div className={classes.name}>
          <Title order={2} size="h3" id={id}>
            {nameOf(student)}
          </Title>
          {student.grade !== null && (
            <Text c="muted">{`Grade ${student.grade}`}</Text>
          )}
        </div>
      )}
      {expectations.length === 0 ? (
        <Text>{`${student.firstName} hasn't played any games yet.`}</Text>
      ) : (
        <>
          <section aria-labelledby={part("math")} className={classes.part}>
            <SectionTitle id={part("math")} icon="chart" order={3} size="h5">
              Math
            </SectionTitle>
            {opening ? (
              <div data-walkthrough="plays">
                <Text size="sm" c="muted" className={classes.screenOnly}>
                  {`Open an expectation to see each time ${student.firstName} played a game for it.`}
                </Text>
                <Accordion
                  variant="list"
                  value={opening.open}
                  onChange={opening.onOpen}
                  items={byExpectation(expectations).map(
                    ({ expectation, lines }) => ({
                      value: expectation.id,
                      title: (
                        <span className={classes.opener}>
                          <span className={classes.openerTop}>
                            {/* Room for the link laid over it, still in the button's name. */}
                            <span
                              className={`${classes.strong} ${classes.underLink}`}
                            >
                              {expectationLabel(expectation)}
                            </span>
                            <span
                              className={`${classes.screenOnly} ${classes.summary}`}
                            >
                              {opening.summary(expectation.id)}
                            </span>
                          </span>
                          <span>{expectation.description}</span>
                          {lines.map((line) => (
                            <Tally key={line.tierGrade} line={line} />
                          ))}
                        </span>
                      ),
                      overlay: (
                        <OfficialCode
                          expectation={expectation}
                          className={`${classes.strong} ${classes.overLink} ${classes.screenOnly}`}
                        />
                      ),
                      content: (
                        <div className={classes.screenOnly}>
                          {opening.panel(expectation.id)}
                        </div>
                      ),
                    }),
                  )}
                />
              </div>
            ) : (
              <ul className={classes.list}>
                {expectations.map((line) => (
                  <li key={`${line.expectation.id}|${line.tierGrade}`}>
                    <ExpectationLine line={line} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby={part("next")} className={classes.part}>
            <SectionTitle
              id={part("next")}
              icon="idea"
              tone="misconception"
              order={3}
              size="h5"
            >
              What to work on next
            </SectionTitle>
            {nextSteps.length === 0 ? (
              <Text c="muted">
                No common mistakes showed up in their recent games.
              </Text>
            ) : (
              <ul className={classes.list}>
                {nextSteps.map((m) => (
                  <li key={`${m.game}|${m.id}`}>
                    {m.description}{" "}
                    <span className={classes.muted}>({m.gameName})</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby={part("skills")} className={classes.part}>
            <SectionTitle
              id={part("skills")}
              icon="sparkles"
              order={3}
              size="h5"
            >
              Learning Skills
            </SectionTitle>
            {withEvidence(learningSkills).length === 0 && (
              <Text c="muted">None yet.</Text>
            )}
            <ul className={classes.list}>
              {withEvidence(learningSkills).map((skill) => (
                <li key={skill.skill}>
                  <span className={classes.strong}>{skill.name}:</span>{" "}
                  {skill.evidence
                    .map(({ kind, count }) => effortLabels[kind](count))
                    .join(", ")}
                </li>
              ))}
            </ul>
            <Text size="sm" c="muted">
              Report cards grade these separately from math.
            </Text>
          </section>
        </>
      )}
      {aside && (
        <div className={`${classes.part} ${classes.screenOnly}`}>{aside}</div>
      )}
    </section>
  );
}

/** Each expectation with its lines, one per tier, in its first line's place. */
function byExpectation(lines: QuickAssessExpectation[]) {
  const groups = new Map<
    string,
    {
      expectation: QuickAssessExpectation["expectation"];
      lines: QuickAssessExpectation[];
    }
  >();
  for (const line of lines) {
    const group = groups.get(line.expectation.id);
    if (group) group.lines.push(line);
    else
      groups.set(line.expectation.id, {
        expectation: line.expectation,
        lines: [line],
      });
  }
  return [...groups.values()];
}

export function ExpectationLine({ line }: { line: QuickAssessExpectation }) {
  return (
    <span className={classes.line}>
      <span>
        <OfficialCode
          expectation={line.expectation}
          className={classes.strong}
        />{" "}
        {line.expectation.description}
      </span>
      <Tally line={line} />
    </span>
  );
}

/** What a line's plays show: the counts, then the games and when. */
function Tally({ line }: { line: QuickAssessExpectation }) {
  const times =
    line.plays === 1
      ? "the last time they played"
      : `over the last ${line.plays} times they played`;
  return (
    <span className={classes.line}>
      <span className={classes.tallyTop}>
        <span
          className={`${classes.meter} ${classes.screenOnly}`}
          aria-hidden="true"
        >
          <span
            style={{
              width: `${line.tasks === 0 ? 0 : (100 * line.onTheirOwn) / line.tasks}%`,
            }}
          />
        </span>
        <span>
          {`${line.onTheirOwn} of ${line.tasks} ${line.tasks === 1 ? "task" : "tasks"} done on their own, ${times}`}
        </span>
      </span>
      <span className={classes.muted}>
        {[
          line.games.map((g) => g.name).join(", "),
          span(line.first, line.last),
          line.otherTier &&
            `Played at the Grade ${line.tierGrade} level, not their own grade`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </span>
    </span>
  );
}

/** "Oct 3 to Oct 20", or one day. By the student's device clock. */
export function span(first: string, last: string) {
  const day = (at: string) =>
    new Date(at).toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
    });
  return day(first) === day(last)
    ? day(first)
    : `${day(first)} to ${day(last)}`;
}
