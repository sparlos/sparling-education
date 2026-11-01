// One play, opened: the play at a glance (a mark per task, and how it
// ended), then what each task asked and every try at it in order (explored
// ones too), each try marked with how it went, with the help the game gave,
// what the student did and any misconception each revealed.
import { Icon } from "@repo/ui/icon";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import type { Attempt, Play } from "../platform/ports.ts";
import { nameOf } from "./Dashboard.tsx";
import classes from "./drill-down.module.css";
import { endingLabels, noEnding, when } from "./Evidence.tsx";
import { ButtonLink, useUp } from "./links.tsx";
import {
  attemptOutcome,
  endingIcons,
  type Outcome,
  OutcomeMark,
  OutcomeStrip,
  outcomeLabels,
  ShowedChip,
  taskOutcome,
} from "./Outcome.tsx";
import { TeacherText } from "./TeacherText.tsx";

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
  const outcomes = play.tasks.map((task) => taskOutcome(task.attempts));
  return (
    <Stack gap="lg">
      <div>
        <ButtonLink
          to="/classes/$classId/students/$studentId"
          params={{ classId, studentId: play.student.id }}
          search={expectationId ? { expectation: expectationId } : {}}
          variant="subtle"
          onClick={up}
        >
          {student}
        </ButtonLink>
      </div>
      <div>
        <Title order={1}>
          {play.gameName} · {when(play.at)}
        </Title>
        <Text c="muted">
          {student} · Grade {play.tierGrade} tier
        </Text>
      </div>
      <div className={classes.summary}>
        <OutcomeStrip outcomes={outcomes} size="md" />
        <span>{counted(outcomes)}</span>
        <span className={classes.summaryEnding}>
          <Icon
            name={play.ending ? endingIcons[play.ending] : "clock"}
            size={18}
          />
          <span>
            How it ended: {play.ending ? endingLabels[play.ending] : noEnding}
            {play.ending === "crashed" &&
              ". It doesn't count for or against them."}
          </span>
        </span>
      </div>
      <ol className={classes.tasks}>
        {play.tasks.map((task, i) => (
          <li
            key={task.task}
            className={classes.task}
            data-outcome={outcomes[i]}
            data-walkthrough="tries"
          >
            <div className={classes.taskHead}>
              <Title order={2} size="h5">
                Task {i + 1}
              </Title>
              <span className={classes.taskOutcome} data-outcome={outcomes[i]}>
                {outcomeLabels[outcomes[i] ?? "not-yet"]}
              </span>
            </div>
            {task.asked && (
              <Text className={classes.asked}>
                <TeacherText text={task.asked} />
              </Text>
            )}
            <ol className={classes.attempts}>
              {task.attempts.map((attempt, n) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: attempts never reorder
                  key={n}
                  className={classes.attempt}
                  data-succeeded={attempt.succeeded}
                  data-exploring={attempt.exploring}
                >
                  <OutcomeMark outcome={attemptOutcome(attempt)} />
                  <span className={classes.try}>
                    {n === 0 ? "First try" : `Retry ${n}`}
                  </span>
                  <span className={classes.outcome}>{outcome(attempt)}</span>
                  {attempt.detail && (
                    <span className={classes.detail}>
                      <TeacherText text={attempt.detail} />
                    </span>
                  )}
                  {attempt.misconception && (
                    <span className={classes.attemptShowed}>
                      <ShowedChip>
                        {attempt.misconception.description}
                      </ShowedChip>
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </Stack>
  );
}

/** "2 on their own, 3 with help, 1 not yet": the strip, in words. */
function counted(outcomes: readonly Outcome[]) {
  const count = (o: Outcome) => outcomes.filter((x) => x === o).length;
  const own = count("own");
  return [
    `${own} of ${outcomes.length} ${outcomes.length === 1 ? "task" : "tasks"} on their own`,
    count("help") > 0 && `${count("help")} with help`,
    count("not-yet") > 0 && `${count("not-yet")} not yet`,
    count("explored") > 0 && `${count("explored")} only explored`,
  ]
    .filter(Boolean)
    .join(", ");
}

function outcome({ succeeded, exploring, assisted }: Attempt) {
  // Exploring is never right or wrong, and never has help.
  if (exploring) return "Explored";
  const result = succeeded ? "Got it" : "Not yet";
  return assisted ? `${result}, ${helpLabels[assisted]}` : result;
}
