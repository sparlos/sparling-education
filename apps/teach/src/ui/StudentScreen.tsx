// A student's page, opened from the dashboard: their quick assess, laid out
// as a report card is written (math by expectation, next steps seen in play,
// then Learning Skills, which report cards keep apart), ready to print. On
// screen, each expectation opens on its bands and plays, newest first, and
// the student can be recognised. Counts only, never a level: the grade is the
// teacher's.
import { brandName } from "@repo/tokens";
import { Button } from "@repo/ui/button";
import { InitialCircle } from "@repo/ui/initial-circle";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import { useEffect } from "react";
import type {
  Class,
  Evidence,
  QuickAssessStudent,
  StudentPage,
} from "../platform/ports.ts";
import { Band, nameOf } from "./Dashboard.tsx";
import drill from "./drill-down.module.css";
import { EvidencePanel } from "./Evidence.tsx";
import { ButtonLink, useUp } from "./links.tsx";
import { StudentBlock } from "./QuickAssess.tsx";
import classes from "./quick-assess.module.css";
import { type OnRecognise, StudentRecognition } from "./Recognition.tsx";

export function StudentScreen({
  cls,
  page,
  assessed,
  evidence,
  open,
  onOpen,
  onRecognise,
  today,
}: {
  cls: Class;
  page: StudentPage;
  assessed: QuickAssessStudent;
  /** The open expectation's evidence, when one is open. */
  evidence: Evidence | null;
  /** The expectation open on its bands and plays. */
  open: string | null;
  onOpen(expectationId: string | null): void;
  onRecognise: OnRecognise;
  /** The date it's printed on. */
  today: Date;
}) {
  const up = useUp();
  const { student, recognised, recognition } = page;
  const who = `${nameOf(student)}, ${cls.name}`;
  const date = today.toLocaleDateString("en-CA", { dateStyle: "long" });
  // Saving as a PDF names the file after the page's title.
  useEffect(() => {
    const before = document.title;
    document.title = `Quick assess, ${who}, ${date}`;
    return () => {
      document.title = before;
    };
  }, [who, date]);

  const opening = {
    open,
    onOpen,
    summary: (id: string) => {
      const result = page.results.find((r) => r.expectation.id === id);
      return (
        result && (
          <span
            className={drill.band}
            data-understanding={result.result.understanding}
          >
            <Band result={result.result} />
          </span>
        )
      );
    },
    panel: (id: string) =>
      evidence &&
      evidence.expectation.id === id && (
        <EvidencePanel
          classId={cls.id}
          evidence={evidence}
          bands={evidence.results.length > 1}
        />
      ),
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
        <div data-walkthrough="evidence" className={classes.who}>
          <span className={classes.screenOnly}>
            <InitialCircle id={student.id} name={student.firstName} size="lg" />
          </span>
          <div>
            <Title order={1}>{nameOf(student)}</Title>
            <Text c="muted">
              {student.grade === null
                ? "No grade picked yet"
                : `Grade ${student.grade}`}
            </Text>
            <Text className={classes.printOnly}>{`${cls.name} · ${date}`}</Text>
          </div>
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
        {`What ${student.firstName}'s games show so far. Use it with what you see in class. ${brandName} never gives a level: you decide the grade.`}
      </Text>
      <StudentBlock
        assessed={assessed}
        named={false}
        opening={opening}
        aside={
          <div data-walkthrough="recognise">
            <StudentRecognition
              student={student}
              recognised={recognised}
              settings={recognition}
              onRecognise={onRecognise}
            />
          </div>
        }
      />
    </Stack>
  );
}
