// One student's evidence for one expectation, opened on their page: their
// understanding at each tier, then every play with evidence for it, newest
// first, each opening on its attempts.
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import { Link } from "@tanstack/react-router";
import type { Ending, Evidence, EvidencePlay } from "../platform/ports.ts";
import { Band } from "./Dashboard.tsx";
import classes from "./drill-down.module.css";

/** How each play ended, in a teacher's words. */
export const endingLabels: Record<Exclude<Ending, null>, string> = {
  finished: "Finished",
  left: "Left before the end",
  crashed: "Stopped by a technical problem",
};

/** A play with no ending yet. */
export const noEnding = "Not finished, or not all sent yet";

export function EvidencePanel({
  classId,
  evidence: { student, results, plays },
  bands = true,
}: {
  classId: string;
  evidence: Evidence;
  /** Whether to show their understanding at each tier: not where it's shown already. */
  bands?: boolean;
}) {
  return (
    <div className={classes.panel}>
      {!bands ? null : results.length === 0 ? (
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
        <section
          aria-label="Each time they played, newest first"
          className={classes.section}
        >
          <Title order={3} size="h5">
            Each time they played, newest first
          </Title>
          <ol className={classes.plays}>
            {plays.map((play) => (
              <li key={play.play}>
                <PlayCard
                  classId={classId}
                  studentId={student.id}
                  play={play}
                />
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function PlayCard({
  classId,
  studentId,
  play,
}: {
  classId: string;
  studentId: string;
  play: EvidencePlay;
}) {
  const tally = [
    `${play.onTheirOwn} of ${play.tasks} ${play.tasks === 1 ? "task" : "tasks"} on their own`,
    play.withHelp > 0 && `${play.withHelp} with help`,
    play.notYet > 0 && `${play.notYet} not yet`,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <Link
      to="/classes/$classId/students/$studentId/plays/$playId"
      params={{ classId, studentId, playId: play.play }}
      state={{ fromAbove: true }}
      className={classes.playCard}
    >
      <span className={classes.playTitle}>
        {play.gameName} · {when(play.at)}
      </span>
      <span className={classes.muted}>
        Grade {play.tierGrade} level ·{" "}
        {play.ending ? endingLabels[play.ending] : noEnding}
      </span>
      <span>{tally}</span>
      <span className={classes.muted}>
        {`${play.tries} ${play.tries === 1 ? "try" : "tries"}`}
        {play.explored > 0 && `, and ${play.explored} explored`}
      </span>
      {play.misconceptions.map((m) => (
        <span key={m.id} className={classes.showed}>
          Showed: {m.description}
        </span>
      ))}
      {!play.counts && (
        <span className={classes.muted}>
          {play.ending === "crashed"
            ? "Not counted, because it crashed."
            : "Not counted: only their most recent games count."}
        </span>
      )}
    </Link>
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
