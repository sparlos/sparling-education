// The class timer, on the class's dashboard: type how many minutes students
// have and start it; while it runs, the time left to the second, with more
// time or a stop; once it runs out, a way to let students carry on.
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Text } from "@repo/ui/text";
import { TextInput } from "@repo/ui/text-input";
import { useEffect, useState } from "react";
import {
  type ClassTimer,
  moreTimeMinutes,
  timerMaxMinutes,
  timeUpHoldMinutes,
} from "../platform/ports.ts";
import classes from "./class-timer.module.css";

export interface TimerActions {
  /** Starts the class timer; resolves once the screen shows it. */
  start(minutes: number): Promise<void>;
  /** Gives the running timer more minutes; resolves once the screen shows it. */
  addTime(): Promise<void>;
  /** Clears the timer, running or run out; resolves once the screen shows it. */
  stop(): Promise<void>;
}

const minuteMs = 60_000;

/** The time now, drawn again each second. */
function useNow() {
  const [, setTicks] = useState(0);
  useEffect(() => {
    const tick = setInterval(() => setTicks((n) => n + 1), 1000);
    return () => clearInterval(tick);
  }, []);
  return Date.now();
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

/** The time left to the second: "12:05", or "1:02:05" past an hour. */
export function countdown(ms: number) {
  const total = Math.ceil(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}

/** The whole minutes typed, or null when it isn't a length a timer can have. */
function parseMinutes(typed: string): number | null {
  const trimmed = typed.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const minutes = Number(trimmed);
  return minutes >= 1 && minutes <= timerMaxMinutes ? minutes : null;
}

const clockTime = new Intl.DateTimeFormat("en-CA", {
  hour: "numeric",
  minute: "2-digit",
});

export function TimerBar({
  timer,
  actions,
}: {
  timer: ClassTimer | null;
  actions: TimerActions;
}) {
  const now = useNow();
  const state = timerState(timer, now);
  const [typed, setTyped] = useState("");
  const [invalid, setInvalid] = useState(false);
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
    <Card variant="soft" tone="accent">
      <section aria-label="Class timer" className={classes.bar}>
        <div className={classes.text}>
          <Text>Class timer</Text>
          <Text size="sm" c="muted">
            {state.kind === "running"
              ? "Students see the time left on every screen."
              : state.kind === "up"
                ? `Students see "Time's up" until ${clockTime.format(
                    state.endsAt + timeUpHoldMinutes * minuteMs,
                  )}.`
                : "Show students how long they have. When time's up, their game ends."}
          </Text>
        </div>
        {state.kind === "none" && (
          // The message below says what's wrong, in place of the browser's.
          <form
            noValidate
            className={classes.controls}
            onSubmit={(event) => {
              event.preventDefault();
              const minutes = parseMinutes(typed);
              setInvalid(minutes === null);
              if (minutes !== null)
                act(async () => {
                  await actions.start(minutes);
                  setTyped("");
                });
            }}
          >
            <TextInput
              label="Minutes"
              name="minutes"
              type="number"
              inputMode="numeric"
              min={1}
              max={timerMaxMinutes}
              className={classes.minutes}
              value={typed}
              onChange={(value) => {
                setTyped(value);
                setInvalid(false);
              }}
              error={
                invalid
                  ? `Type a whole number of minutes, from 1 to ${timerMaxMinutes}.`
                  : undefined
              }
            />
            <Button type="submit" disabled={busy}>
              Start timer
            </Button>
          </form>
        )}
        {state.kind === "running" && (
          <div className={classes.controls}>
            <span className={classes.countdown} role="timer">
              {countdown(state.left)}
              <span className={classes.left}> left</span>
            </span>
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
              onClick={() => act(actions.stop)}
            >
              Stop timer
            </Button>
          </div>
        )}
        {state.kind === "up" && (
          <div className={classes.controls}>
            <span className={classes.countdown}>Time's up</span>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => act(actions.stop)}
            >
              Let students carry on
            </Button>
          </div>
        )}
        {failed && (
          <Text size="sm">
            That didn't save. Check your connection and try again.
          </Text>
        )}
      </section>
    </Card>
  );
}
