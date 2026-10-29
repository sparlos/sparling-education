// One play, opened: each task's attempts in order, with retries, the help
// the game gave and any misconception each revealed, and how the play ended.
import { Button } from "@repo/ui/button";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import { useCallback } from "react";
import type { Attempt, Class, TeacherPort } from "../platform/ports.ts";
import { nameOf } from "./Dashboard.tsx";
import classes from "./drill-down.module.css";
import { endingLabels, noEnding, when } from "./Evidence.tsx";
import { Loaded } from "./Loaded.tsx";

/** The help the game gave before an attempt, in a teacher's words. */
const helpLabels: Record<Exclude<Attempt["assisted"], null>, string> = {
  hint: "with a hint",
  demonstration: "after a demonstration",
  guided: "guided through it",
};

export function PlayScreen({
  teacher,
  cls,
  studentId,
  studentName,
  playId,
  onBack,
}: {
  teacher: TeacherPort;
  cls: Class;
  studentId: string;
  /** "Sam R.", for the way back to their evidence. */
  studentName: string;
  playId: string;
  onBack(): void;
}) {
  const load = useCallback(
    () => teacher.play(cls.id, studentId, playId),
    [teacher, cls.id, studentId, playId],
  );
  return (
    <Stack gap="lg">
      <div>
        <Button variant="subtle" onClick={onBack}>
          {`${studentName}'s evidence`}
        </Button>
      </div>
      <Loaded load={load} what="the play">
        {(play) => (
          <>
            <div>
              <Title order={1}>
                {play.gameName} · {when(play.at)}
              </Title>
              <Text c="muted">
                {nameOf(play.student)} · Grade {play.tierGrade} tier
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
              {play.ending === "crashed" &&
                ". It doesn't count for or against them."}
            </Text>
          </>
        )}
      </Loaded>
    </Stack>
  );
}

function outcome({ succeeded, assisted }: Attempt) {
  const result = succeeded ? "Got it" : "Not yet";
  return assisted ? `${result}, ${helpLabels[assisted]}` : result;
}
