// A dashboard cell, opened: one student's evidence for one expectation. Their
// understanding at each tier, then every play with evidence for it, oldest
// first, each opening on its attempts.
import { Button } from "@repo/ui/button";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import { useCallback } from "react";
import type {
  Class,
  Ending,
  EvidencePlay,
  TeacherPort,
} from "../platform/ports.ts";
import { Band, expectationLabel, nameOf } from "./Dashboard.tsx";
import classes from "./drill-down.module.css";
import { Loaded } from "./Loaded.tsx";

/** How each play ended, in a teacher's words. */
export const endingLabels: Record<Exclude<Ending, null>, string> = {
  finished: "Finished",
  left: "Left before the end",
  crashed: "Stopped by a technical problem",
};

/** A play with no ending yet. */
export const noEnding = "Not finished, or not all sent yet";

export function EvidenceScreen({
  teacher,
  cls,
  studentId,
  expectationId,
  onBack,
  onOpenPlay,
}: {
  teacher: TeacherPort;
  cls: Class;
  studentId: string;
  expectationId: string;
  onBack(): void;
  onOpenPlay(playId: string, studentName: string): void;
}) {
  const load = useCallback(
    () => teacher.evidence(cls.id, studentId, expectationId),
    [teacher, cls.id, studentId, expectationId],
  );
  return (
    <Stack gap="lg">
      <div>
        <Button variant="subtle" onClick={onBack}>
          {`${cls.name} results`}
        </Button>
      </div>
      <Loaded load={load} what="the student's evidence">
        {({ student, expectation, results, plays }) => (
          <>
            <div>
              <Title order={1}>{nameOf(student)}</Title>
              <Text className={classes.code}>
                {expectationLabel(expectation)}
              </Text>
              <Text c="muted">{expectation.description}</Text>
            </div>
            {results.length === 0 ? (
              <Text>No evidence yet.</Text>
            ) : (
              <ul className={classes.results} aria-label="Understanding">
                {results.map((result) => (
                  <li
                    key={result.tierGrade}
                    className={classes.band}
                    data-understanding={result.understanding}
                  >
                    <Band result={result} />
                  </li>
                ))}
              </ul>
            )}
            {plays.length > 0 && (
              <section aria-labelledby="plays" className={classes.section}>
                <Title order={2} size="h4" id="plays">
                  Plays, oldest first
                </Title>
                <ol className={classes.plays}>
                  {plays.map((play) => (
                    <li key={play.play}>
                      <PlayCard
                        play={play}
                        onOpen={() => onOpenPlay(play.play, nameOf(student))}
                      />
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </>
        )}
      </Loaded>
    </Stack>
  );
}

function PlayCard({ play, onOpen }: { play: EvidencePlay; onOpen(): void }) {
  const tally = [
    `${play.onTheirOwn} of ${play.tasks} ${play.tasks === 1 ? "task" : "tasks"} on their own`,
    play.withHelp > 0 && `${play.withHelp} with help`,
    play.notYet > 0 && `${play.notYet} not yet`,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <button type="button" className={classes.playCard} onClick={onOpen}>
      <span className={classes.playTitle}>
        {play.gameName} · {when(play.at)}
      </span>
      <span className={classes.muted}>
        Grade {play.tierGrade} tier ·{" "}
        {play.ending ? endingLabels[play.ending] : noEnding}
      </span>
      <span>{tally}</span>
      {play.misconceptions.map((m) => (
        <span key={m.id} className={classes.showed}>
          Showed: {m.description}
        </span>
      ))}
      {!play.counts && (
        <span className={classes.muted}>
          {play.ending === "crashed"
            ? "Not counted, because it crashed."
            : "Not counted: only the most recent plays are."}
        </span>
      )}
    </button>
  );
}

/** "Oct 20, 2:05 p.m.", by the student's device clock. */
export function when(at: string) {
  return new Date(at).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
