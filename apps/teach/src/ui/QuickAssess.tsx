// Quick assess, for writing report cards, laid out the way one is written:
// for each student, what their plays show for each expectation, the next
// steps those plays point to, and their Learning Skills, which report cards
// keep apart from the math grade. Counts only, never a level, rating or mark:
// the grade is the teacher's. Made to print: the navigation goes, a student
// stays on one page where they fit, and every page's header names the class
// or student and the date.
import { Button } from "@repo/ui/button";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import { type ReactNode, useEffect } from "react";
import type {
  Class,
  QuickAssessExpectation,
  QuickAssessStudent,
} from "../platform/ports.ts";
import { nameOf } from "./Dashboard.tsx";
import { effortLabels, withEvidence } from "./effort.ts";
import { ButtonLink, useUp } from "./links.tsx";
import { OfficialCode } from "./OfficialCode.tsx";
import classes from "./quick-assess.module.css";

export function ClassQuickAssessScreen({
  cls,
  students,
  today,
}: {
  cls: Class;
  students: QuickAssessStudent[];
  /** The date it's printed on. */
  today: Date;
}) {
  const up = useUp();
  return (
    <QuickAssessPage
      back={
        <ButtonLink
          to="/classes/$classId"
          params={{ classId: cls.id }}
          variant="subtle"
          onClick={up}
        >
          {cls.name}
        </ButtonLink>
      }
      who={cls.name}
      today={today}
      students={students}
    />
  );
}

function QuickAssessPage({
  back,
  who,
  today,
  students,
}: {
  back: ReactNode;
  /** The class or student, for every page's header. */
  who: string;
  today: Date;
  students: QuickAssessStudent[];
}) {
  const date = today.toLocaleDateString("en-CA", { dateStyle: "long" });
  // Saving as a PDF names the file after the page's title.
  useEffect(() => {
    const before = document.title;
    document.title = `Quick assess, ${who}, ${date}`;
    return () => {
      document.title = before;
    };
  }, [who, date]);

  return (
    <Stack gap="lg">
      <div className={classes.screenOnly}>{back}</div>
      <div className={classes.heading}>
        <div>
          <Title order={1}>Quick assess</Title>
          <Text>{who}</Text>
          <Text c="muted">{date}</Text>
        </div>
        <Button
          variant="secondary"
          className={classes.screenOnly}
          onClick={() => window.print()}
        >
          Print
        </Button>
      </div>
      <Text className={classes.note}>
        What your students' plays show, to weigh with your own observations when
        you write report cards. Kindling never gives a level: the grade is
        yours.
      </Text>
      {/* A table only so the header repeats on every printed page. */}
      <table className={classes.pages} role="presentation">
        <thead aria-hidden="true">
          <tr>
            <td className={classes.pageHeader}>
              {`Quick assess · ${who} · ${date}`}
            </td>
          </tr>
        </thead>
        <tbody>
          {students.map((assessed) => (
            <tr key={assessed.student.id} className={classes.page}>
              <td>
                <StudentBlock assessed={assessed} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Stack>
  );
}

export function StudentBlock({
  assessed: { student, expectations, nextSteps, learningSkills },
  named = true,
  extra,
}: {
  assessed: QuickAssessStudent;
  /** Whether the block names its student: not on their own page. */
  named?: boolean;
  /** Screen-only extras after an expectation's lines, e.g. its plays. */
  extra?: (expectation: QuickAssessExpectation) => ReactNode;
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
        <Text>No plays yet.</Text>
      ) : (
        <>
          <section aria-labelledby={part("math")} className={classes.part}>
            <Title order={3} size="h5" id={part("math")}>
              Math: what their plays show
            </Title>
            <ul className={classes.list}>
              {expectations.map((line, i) => (
                <li key={`${line.expectation.id}|${line.tierGrade}`}>
                  <ExpectationLine line={line} />
                  {/* Once for an expectation, however many tiers it has. */}
                  {extra &&
                    expectations.findIndex(
                      (l) => l.expectation.id === line.expectation.id,
                    ) === i &&
                    extra(line)}
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby={part("next")} className={classes.part}>
            <Title order={3} size="h5" id={part("next")}>
              Next steps seen in play
            </Title>
            {nextSteps.length === 0 ? (
              <Text c="muted">No misconceptions in their recent plays.</Text>
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
            <Title order={3} size="h5" id={part("skills")}>
              Learning Skills
            </Title>
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
              Reported separately from the math grade.
            </Text>
          </section>
        </>
      )}
    </section>
  );
}

export function ExpectationLine({ line }: { line: QuickAssessExpectation }) {
  const plays =
    line.plays === 1 ? "most recent play" : `${line.plays} most recent plays`;
  return (
    <span className={classes.line}>
      <span>
        <OfficialCode
          expectation={line.expectation}
          className={classes.strong}
        />{" "}
        {line.expectation.description}
      </span>
      <span>
        {`${line.onTheirOwn} of ${line.tasks} ${line.tasks === 1 ? "task" : "tasks"} on their own, in their ${plays}`}
      </span>
      <span className={classes.muted}>
        {[
          line.games.map((g) => g.name).join(", "),
          span(line.first, line.last),
          line.otherTier && `Grade ${line.tierGrade} tier, not their grade`,
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
