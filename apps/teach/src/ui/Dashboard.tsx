// A class's dashboard: its students against the expectations its games
// evidence, each cell saying how well that student's plays show
// understanding of that expectation, or that there's no evidence yet.
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Loader } from "@repo/ui/loader";
import { Stack } from "@repo/ui/stack";
import { Table } from "@repo/ui/table";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import { useCallback, useEffect, useState } from "react";
import type {
  Class,
  Dashboard,
  DashboardStudent,
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

export function DashboardScreen({
  teacher,
  cls,
  onBack,
}: {
  teacher: TeacherPort;
  cls: Class;
  onBack(): void;
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
          <Grid dashboard={dashboard} split={cls.grades.length > 1} />
        ))}
    </Stack>
  );
}

function Grid({ dashboard, split }: { dashboard: Dashboard; split: boolean }) {
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
              <span className={classes.code}>
                Grade {e.grade} · {e.code}
              </span>
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
              <Cell
                key={e.id}
                result={student.results.find((r) => r.expectation === e.id)}
              />
            )),
          ],
        }))}
      />
    </div>
  );
}

function Cell({ result }: { result: Result | undefined }) {
  if (!result)
    return <span className={classes.noEvidence}>No evidence yet</span>;
  return (
    <span className={classes.band} data-understanding={result.understanding}>
      {understandingLabels[result.understanding]}
      {result.otherTier && (
        <span className={classes.otherTier}>
          From the Grade {result.tierGrade} tier
        </span>
      )}
    </span>
  );
}

/** "Ada L." */
function nameOf({ firstName, lastInitial }: DashboardStudent) {
  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
}
