// A student's page, opened from their row of the dashboard: their effort
// evidence by Learning Skill, then their results, each opening on its
// evidence, then the recognition they were given. Quick assess joins it
// here later.
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import { Link } from "@tanstack/react-router";
import type {
  Class,
  EffortKind,
  EffortSkill,
  StudentPage,
} from "../platform/ports.ts";
import { Band, expectationLabel, nameOf } from "./Dashboard.tsx";
import { ButtonLink, useUp } from "./links.tsx";
import { type OnRecognise, StudentRecognition } from "./Recognition.tsx";
import classes from "./student.module.css";

/** Each kind of effort evidence, counted, in a teacher's words. */
const effortLabels: Record<EffortKind, (n: number) => string> = {
  improvedAfterMistake: (n) =>
    `${n} ${n === 1 ? "task" : "tasks"} got right after a mistake`,
  finishedPlays: (n) => `${n} ${n === 1 ? "play" : "plays"} finished`,
};

export function StudentScreen({
  cls,
  page: { student, effort, results, recognised, recognition },
  onRecognise,
}: {
  cls: Class;
  page: StudentPage;
  onRecognise: OnRecognise;
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
          {`${cls.name} results`}
        </ButtonLink>
      </div>
      <div>
        <Title order={1}>{nameOf(student)}</Title>
        <Text c="muted">
          {student.grade === null
            ? "No grade picked yet"
            : `Grade ${student.grade}`}
        </Text>
      </div>
      <section aria-labelledby="effort" className={classes.section}>
        <Title order={2} size="h4" id="effort">
          Effort, by Learning Skill
        </Title>
        <ul className={classes.skills}>
          {effort.map((skill) => (
            <li key={skill.skill}>
              <Skill skill={skill} />
            </li>
          ))}
        </ul>
        <Text size="sm" c="muted">
          Effort counts tasks got right after a mistake, and plays finished.
          Never time spent or how many tries, and never a play stopped by a
          technical problem.
        </Text>
      </section>
      <section aria-labelledby="results" className={classes.section}>
        <Title order={2} size="h4" id="results">
          Results
        </Title>
        {results.length === 0 ? (
          <Text>No evidence yet.</Text>
        ) : (
          <ul className={classes.results}>
            {/* Not `fromAbove`: the evidence's way up is the dashboard. */}
            {results.map(({ expectation, result }) => (
              <li key={expectation.id}>
                <Link
                  to="/classes/$classId/students/$studentId/expectations/$expectationId"
                  params={{
                    classId: cls.id,
                    studentId: student.id,
                    expectationId: expectation.id,
                  }}
                  className={classes.result}
                >
                  <span className={classes.code}>
                    {expectationLabel(expectation)}
                  </span>
                  <span className={classes.muted}>
                    {expectation.description}
                  </span>
                  <span
                    className={classes.band}
                    data-understanding={result.understanding}
                  >
                    <Band result={result} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <StudentRecognition
        student={student}
        recognised={recognised}
        settings={recognition}
        onRecognise={onRecognise}
      />
    </Stack>
  );
}

function Skill({ skill }: { skill: EffortSkill }) {
  return (
    <section aria-labelledby={`skill-${skill.skill}`} className={classes.skill}>
      <Title order={3} size="h5" id={`skill-${skill.skill}`}>
        {skill.name}
      </Title>
      {skill.evidence.map(({ kind, count }) => (
        <Text key={kind}>{effortLabels[kind](count)}</Text>
      ))}
    </section>
  );
}
