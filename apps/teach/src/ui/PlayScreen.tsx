// One play, opened: each task's attempts in order, with retries, the help
// the game gave and any misconception each revealed, and how the play ended.
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import type { Attempt, Play } from "../platform/ports.ts";
import { nameOf } from "./Dashboard.tsx";
import classes from "./drill-down.module.css";
import { endingLabels, noEnding, when } from "./Evidence.tsx";
import { ButtonLink, useUp } from "./links.tsx";

/** The help the game gave before an attempt, in a teacher's words. */
const helpLabels: Record<Exclude<Attempt["assisted"], null>, string> = {
  hint: "with a hint",
  demonstration: "after a demonstration",
  guided: "guided through it",
};

export function PlayScreen({ classId, play }: { classId: string; play: Play }) {
  const up = useUp();
  const student = nameOf(play.student);
  // Up is the student's evidence for what the play evidenced.
  const expectationId = play.tasks[0]?.expectation;
  return (
    <Stack gap="lg">
      <div>
        {expectationId ? (
          <ButtonLink
            to="/classes/$classId/students/$studentId/expectations/$expectationId"
            params={{ classId, studentId: play.student.id, expectationId }}
            variant="subtle"
            onClick={up}
          >
            {`${student}'s evidence`}
          </ButtonLink>
        ) : (
          <ButtonLink
            to="/classes/$classId"
            params={{ classId }}
            variant="subtle"
          >
            The class's results
          </ButtonLink>
        )}
      </div>
      <div>
        <Title order={1}>
          {play.gameName} · {when(play.at)}
        </Title>
        <Text c="muted">
          {student} · Grade {play.tierGrade} tier
        </Text>
      </div>
      <ol className={classes.tasks}>
        {play.tasks.map((task, i) => (
          <li key={task.task} className={classes.task}>
            <Title order={2} size="h5">
              Task {i + 1}
            </Title>
            <ol className={classes.attempts}>
              {task.attempts.map((attempt, n) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: attempts never reorder
                  key={n}
                  className={classes.attempt}
                  data-succeeded={attempt.succeeded}
                >
                  <span className={classes.try}>
                    {n === 0 ? "First try" : `Retry ${n}`}
                  </span>
                  <span>{outcome(attempt)}</span>
                  {attempt.misconception && (
                    <span className={classes.showed}>
                      Showed: {attempt.misconception.description}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
      <Text>
        How it ended: {play.ending ? endingLabels[play.ending] : noEnding}
        {play.ending === "crashed" && ". It doesn't count for or against them."}
      </Text>
    </Stack>
  );
}

function outcome({ succeeded, assisted }: Attempt) {
  const result = succeeded ? "Got it" : "Not yet";
  return assisted ? `${result}, ${helpLabels[assisted]}` : result;
}
