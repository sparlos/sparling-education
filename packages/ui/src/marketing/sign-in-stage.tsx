import type { ReactNode } from "react";
import { Title } from "../title";
import classes from "./sign-in-stage.module.css";
import { Sky } from "./sky";
import { Mark, Wordmark } from "./wordmark";

/*
 * The full-screen welcome before someone is signed in: a deep indigo night
 * with slow aurora light, big wings beating slowly off the corners and small
 * glints drifting, and a bright card in the middle holding what to do.
 *
 * `playful` is the student side: the logo's mark, big and floating, over the
 * card, and gold sparkles. Without it (the teacher app) the logo sits over the card and the
 * glints stay violet, since gold there means a misconception.
 */
interface SignInStageProps {
  heading: string;
  /** A line under the heading. */
  lead?: ReactNode;
  /** The sign-in button, a loader, or a way on. */
  children?: ReactNode;
  /** A small line under the card's action, e.g. that the last try failed. */
  note?: ReactNode;
  playful?: boolean;
  /** Announces the card's content as it changes, e.g. for the student shell. */
  status?: boolean;
}

export function SignInStage({
  heading,
  lead,
  children,
  note,
  playful,
  status,
}: SignInStageProps) {
  return (
    <main
      className={classes.stage}
      data-tone={playful ? "brand" : "educator"}
      data-playful={playful || undefined}
    >
      <Sky variant="night" playful={playful} />

      <div className={classes.column}>
        {playful ? (
          <div className={classes.emblem} aria-hidden="true">
            <span className={classes.halo} />
            <Mark inverse />
          </div>
        ) : (
          <div className={classes.logo}>
            <Wordmark size="lg" inverse byline />
          </div>
        )}
        <section
          className={classes.card}
          role={status ? "status" : undefined}
          aria-label={status ? undefined : heading}
        >
          <Title
            order={1}
            size={playful ? "h1" : "h2"}
            c={playful ? "inherit" : "ink"}
            className={classes.heading}
          >
            {heading}
          </Title>
          {lead && <div className={classes.lead}>{lead}</div>}
          {children && <div className={classes.action}>{children}</div>}
          {note && <div className={classes.note}>{note}</div>}
        </section>
      </div>
    </main>
  );
}
