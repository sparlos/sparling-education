// A class's share panel, opened from the dashboard's "Share": the class
// timer, the class join link and each game's link, each with its copy
// button, and each game's on/off switch beside its link.
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Menu } from "@repo/ui/menu";
import { Switch } from "@repo/ui/switch";
import { Text } from "@repo/ui/text";
import { VisuallyHidden } from "@repo/ui/visually-hidden";
import { type ReactNode, useEffect, useState } from "react";
import {
  type Class,
  type ClassGame,
  type ClassTimer,
  moreTimeMinutes,
  type TimerMinutes,
  timerMinutes,
  timeUpHoldMinutes,
} from "../platform/ports.ts";
import classes from "./share.module.css";

export interface ShareActions {
  /** Turns a game on or off for the class; resolves once the screen shows it. */
  switchGame(slug: string, on: boolean): Promise<void>;
  /** Starts the class timer; resolves once the screen shows it. */
  startTimer(minutes: TimerMinutes): Promise<void>;
  /** Gives the running timer more minutes; resolves once the screen shows it. */
  addTime(): Promise<void>;
  /** Clears the timer, running or run out; resolves once the screen shows it. */
  stopTimer(): Promise<void>;
}

export function SharePanel({
  cls,
  actions,
}: {
  cls: Class;
  actions: ShareActions;
}) {
  return (
    <Card variant="soft" tone="accent">
      <section aria-label="Share this class" className={classes.panel}>
        <TimerRow timer={cls.timer} actions={actions} />
        <div className={classes.row}>
          <div className={classes.text}>
            <Text>Class join link</Text>
            <Text size="sm" c="muted" className={classes.url}>
              {cls.joinLink}
            </Text>
          </div>
          <CopyButton text={cls.joinLink}>Copy join link</CopyButton>
        </div>
        <ul className={classes.games}>
          {cls.games.map((game) => (
            <GameRow key={game.slug} game={game} actions={actions} />
          ))}
        </ul>
      </section>
    </Card>
  );
}

function GameRow({
  game,
  actions,
}: {
  game: ClassGame;
  actions: ShareActions;
}) {
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");
  const change = (on: boolean) => {
    setState("busy");
    actions.switchGame(game.slug, on).then(
      () => setState("idle"),
      (error: unknown) => {
        console.error("[teach] Couldn't switch the game", error);
        setState("failed");
      },
    );
  };
  return (
    <li className={classes.row}>
      <Switch
        tone="accent"
        label={game.name}
        checked={game.on}
        disabled={state === "busy"}
        onChange={change}
      />
      {game.on && (
        <CopyButton text={game.link}>
          Copy game link <VisuallyHidden>for {game.name}</VisuallyHidden>
        </CopyButton>
      )}
      {state === "failed" && (
        <Text size="sm">
          That didn't save. Check your connection and try again.
        </Text>
      )}
    </li>
  );
}

const minuteMs = 60_000;

/** The time now, a second at a time. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  return now;
}

/** What the class's timer is doing, at `now`. */
function timerState(timer: ClassTimer | null, now: number) {
  if (!timer) return { kind: "none" } as const;
  const endsAt = Date.parse(timer.endsAt);
  if (now < endsAt) return { kind: "running", left: endsAt - now } as const;
  if (now < endsAt + timeUpHoldMinutes * minuteMs)
    return { kind: "up", endsAt } as const;
  return { kind: "none" } as const;
}

/** "12 min", or "45 s" in the last minute. */
function timeLeft(ms: number) {
  return ms > minuteMs
    ? `${Math.ceil(ms / minuteMs)} min`
    : `${Math.ceil(ms / 1000)} s`;
}

const clockTime = new Intl.DateTimeFormat("en-CA", {
  hour: "numeric",
  minute: "2-digit",
});

/**
 * The class timer: set one, or, while it runs, see the time left and give
 * more or stop it; once it runs out, let students carry on.
 */
function TimerRow({
  timer,
  actions,
}: {
  timer: ClassTimer | null;
  actions: ShareActions;
}) {
  const now = useNow();
  const state = timerState(timer, now);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const act = (change: () => Promise<void>) => {
    setBusy(true);
    setFailed(false);
    change().then(
      () => setBusy(false),
      (error: unknown) => {
        console.error("[teach] Couldn't change the class timer", error);
        setBusy(false);
        setFailed(true);
      },
    );
  };
  return (
    <div className={classes.row}>
      <div className={classes.text} aria-live="polite">
        <Text>Class timer</Text>
        <Text size="sm" c="muted">
          {state.kind === "running"
            ? `${timeLeft(state.left)} left. Students see it on every screen.`
            : state.kind === "up"
              ? `Time's up. Students see it until ${clockTime.format(
                  state.endsAt + timeUpHoldMinutes * minuteMs,
                )}.`
              : "Show students how long they have. When time's up, their game ends."}
        </Text>
      </div>
      <div className={classes.controls}>
        {state.kind === "none" && (
          <Menu
            label="How long?"
            disabled={busy}
            items={timerMinutes.map((minutes) => ({
              key: String(minutes),
              label: `${minutes} minutes`,
              onClick: () => act(() => actions.startTimer(minutes)),
            }))}
          >
            Set a class timer
          </Menu>
        )}
        {state.kind === "running" && (
          <>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => act(actions.addTime)}
            >
              +{moreTimeMinutes} min
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => act(actions.stopTimer)}
            >
              Stop timer
            </Button>
          </>
        )}
        {state.kind === "up" && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => act(actions.stopTimer)}
          >
            Let students carry on
          </Button>
        )}
      </div>
      {failed && (
        <Text size="sm">
          That didn't save. Check your connection and try again.
        </Text>
      )}
    </div>
  );
}

function CopyButton({ text, children }: { text: string; children: ReactNode }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = () => {
    navigator.clipboard.writeText(text).then(
      () => setState("copied"),
      (error: unknown) => {
        console.error("[teach] Couldn't copy a link", error);
        setState("failed");
      },
    );
  };

  return (
    <Button variant="secondary" onClick={copy}>
      <span aria-live="polite">
        {state === "copied"
          ? "Copied"
          : state === "failed"
            ? "Couldn't copy"
            : children}
      </span>
    </Button>
  );
}
