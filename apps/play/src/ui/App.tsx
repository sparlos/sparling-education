import { Portrait } from "@repo/avatar/portrait";
import type {
  AvatarExpression,
  GameManifest,
  GameProps,
  Progress,
} from "@repo/game-contract";
import { Icon } from "@repo/ui/icon";
import { IconButton } from "@repo/ui/icon-button";
import { Progress as ProgressBar } from "@repo/ui/progress";
import { Stack } from "@repo/ui/stack";
import { Title } from "@repo/ui/title";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameRegistry } from "../games.ts";
import type { AvatarLook, Platform } from "../platform/ports.ts";
import { boot, type ReadyPlay } from "../play/boot.ts";
import type { OutboxOptions } from "../play/outbox.ts";
import type { Ending } from "../play/play.ts";
import { parseRoute } from "../play/routes.ts";
import type { KeyValueStore } from "../play/storage.ts";
import { translator } from "../play/strings.ts";
import { createVoice, type Voice, type VoiceOptions } from "../play/voice.ts";
import { type LineMap, resolveLineUrl } from "../play/voice-lines.ts";
import classes from "./app.module.css";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import { JoinPage, LockerPage, SignInPage } from "./Locker.tsx";
import {
  Message,
  Question,
  ShellLines,
  shellT,
  useShellLine,
} from "./shared.tsx";

export interface AppProps {
  url: URL;
  /** The shell's base path, e.g. "/play/". */
  base: string;
  platform: Platform;
  games: GameRegistry;
  storage: KeyValueStore | null;
  /** Leaves the shell for another page. */
  navigate(url: string): void;
  newId(): string;
  /** The recordings of the shell's own lines; lines without one use browser speech. */
  shellLines?: LineMap;
  /** Browser speech, replaceable in tests. */
  speak?: VoiceOptions["speak"];
  /** How long ending a play waits for attempts to send before leaving anyway. */
  finishTimeoutMs?: number;
  /** Batching and retry timings, for tests. */
  outboxTiming?: Pick<OutboxOptions, "batchDelayMs" | "retryDelaysMs">;
}

type Screen =
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "error" }
  | { kind: "playing"; ready: ReadyPlay }
  | { kind: "ending"; ready: ReadyPlay }
  | { kind: "end-screen"; ready: ReadyPlay; ending: Ending };

const noLines: LineMap = {};

/** The shell: the locker, joining a class, sign-in, or a game, by the URL. */
export function App(props: AppProps) {
  return (
    <ShellLines.Provider value={props.shellLines ?? noLines}>
      <RoutedScreen {...props} />
    </ShellLines.Provider>
  );
}

function RoutedScreen(props: AppProps) {
  const route = useMemo(
    () => parseRoute(props.url, props.base),
    [props.url, props.base],
  );
  switch (route?.kind) {
    case "locker":
      return <LockerPage {...props} />;
    case "join":
      return <JoinPage {...props} joinCode={route.joinCode} />;
    case "sign-in":
      return <SignInPage {...props} />;
    case "game":
      return <GamePage {...props} />;
    case undefined:
      return <Message text={shellT("not-found")} />;
  }
}

function GamePage(props: AppProps) {
  const { url, base, platform, games, storage, navigate, newId, outboxTiming } =
    props;
  const [screen, setScreen] = useState<Screen>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    let ready: ReadyPlay | undefined;
    boot({ url, base, platform, games, storage, newId, outboxTiming }).then(
      (result) => {
        if (cancelled) {
          if (result.kind === "ready")
            for (const outbox of result.ready.outboxes) outbox.dispose();
          return;
        }
        if (result.kind === "sign-in") return navigate(result.url);
        if (result.kind === "locker") return navigate(base);
        if (result.kind === "not-found")
          return setScreen({ kind: "not-found" });
        ready = result.ready;
        setScreen({ kind: "playing", ready });
      },
      (error: unknown) => {
        console.error("[play] Couldn't start the game", error);
        if (!cancelled) setScreen({ kind: "error" });
      },
    );
    return () => {
      cancelled = true;
      for (const outbox of ready?.outboxes ?? []) outbox.dispose();
    };
  }, [url, base, platform, games, storage, navigate, newId, outboxTiming]);

  // Send attempts as soon as the connection is back, and before the tab is hidden.
  const ready = "ready" in screen ? screen.ready : undefined;
  useEffect(() => {
    if (!ready) return;
    const flush = () => {
      for (const outbox of ready.outboxes) void outbox.flush();
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [ready]);

  const end = useCallback(
    (ready: ReadyPlay, ending: Ending) => {
      setScreen({ kind: "ending", ready });
      void ready.play.end(ending, props.finishTimeoutMs).then((exit) => {
        if (exit.kind === "hub") navigate(exit.url);
        else setScreen({ kind: "end-screen", ready, ending: exit.ending });
      });
    },
    [navigate, props.finishTimeoutMs],
  );

  switch (screen.kind) {
    case "loading":
      return <Message text={shellT("loading")} busy />;
    case "not-found":
      return <Message text={shellT("not-found")} />;
    case "error":
      return (
        <Message text={shellT("error")}>
          <IconButton
            label={shellT("try-again")}
            onClick={() => navigate(url.href)}
          >
            <Icon name="replay" size={32} />
          </IconButton>
        </Message>
      );
    case "playing":
    case "ending":
      return (
        <PlayScreen
          ready={screen.ready}
          ending={screen.kind === "ending"}
          onEnd={end}
          speak={props.speak}
        />
      );
    case "end-screen":
      return (
        <EndScreen
          ending={screen.ending}
          look={screen.ready.student.look}
          onPlayAgain={() => navigate(`${base}${screen.ready.link.slug}`)}
          speak={props.speak}
        />
      );
  }
}

function PlayScreen({
  ready,
  ending,
  onEnd,
  speak,
}: {
  ready: ReadyPlay;
  ending: boolean;
  onEnd(ready: ReadyPlay, ending: Ending): void;
  speak?: VoiceOptions["speak"];
}) {
  const { game, student, tier, play } = ready;
  const [hasLine, setHasLine] = useState(false);
  const [asking, setAsking] = useState(false);
  // Browsers block sound until the page is tapped, so every game waits for
  // a tap on start before its first line.
  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const voice = useMemo<Voice>(
    () =>
      createVoice({
        text: translator(game.manifest.strings, student.locale),
        locale: student.locale,
        lineUrl: (id) => resolveLineUrl(game, student.locale, id),
        speak,
      }),
    [game, student, speak],
  );
  useEffect(() => () => voice.stop(), [voice]);

  // Games re-render often; give them props that only change when they must.
  const ended = useRef(false);
  const endOnce = useCallback(
    (how: Ending) => {
      if (ended.current) return;
      ended.current = true;
      onEnd(ready, how);
    },
    [onEnd, ready],
  );
  const props = useMemo<GameProps<GameManifest>>(
    () => ({
      tier,
      locale: student.locale,
      Avatar: avatarFor(student.look),
      t: translator(game.manifest.strings, student.locale),
      say(...ids) {
        setHasLine(true);
        return voice.say(...ids);
      },
      onAttempt: (attempt) => play.record(attempt),
      onProgress: (next) => setProgress(next),
      onFinish: () => endOnce("finished"),
    }),
    [game, student, tier, play, voice, endOnce],
  );

  return (
    <main className={classes.play} aria-busy={ending}>
      <div className={classes.controls} inert={asking || ending}>
        <IconButton
          tone="neutral"
          label={shellT("leave")}
          onClick={() => {
            voice.stop();
            setAsking(true);
          }}
          disabled={ending}
        >
          <Icon name="leave" size={32} />
        </IconButton>
        <IconButton
          tone="neutral"
          label={shellT("hear-again")}
          onClick={() => voice.again()}
          disabled={!hasLine}
        >
          <Icon name="speaker" size={32} />
        </IconButton>
      </div>
      <div className={classes.game} inert={asking || ending}>
        {started && game.manifest.progress && progress && (
          <ProgressStrip progress={progress} />
        )}
        <div className={classes.gameBody}>
          <ErrorBoundary
            onError={(error) => {
              console.error(`[play] ${game.manifest.slug} crashed`, error);
              void play.end("crashed");
            }}
            fallback={<Message text={shellT("error")} />}
          >
            {started ? (
              <game.Component {...props} />
            ) : (
              <StartScreen
                look={student.look}
                onStart={() => setStarted(true)}
              />
            )}
          </ErrorBoundary>
        </div>
      </div>
      {asking && !ending && (
        <LeaveQuestion
          look={student.look}
          speak={speak}
          onStay={() => setAsking(false)}
          onLeave={() => endOnce("left")}
        />
      )}
      {ending && <Message text={shellT("saving")} busy overlay />}
    </main>
  );
}

/**
 * How many of a progression-based game's tasks are done: a thin bar, like a
 * page's scroll bar, and "2/6". Feedback that the student is getting
 * somewhere, never a score.
 */
function ProgressStrip({ progress }: { progress: Progress }) {
  const { done, total } = progress;
  return (
    <div className={classes.progress} data-tone="student">
      <div className={classes.progressBar}>
        <ProgressBar
          value={total > 0 ? (100 * Math.min(done, total)) / total : 0}
          label={shellT("progress")}
        />
      </div>
      <span className={classes.progressCount} aria-hidden="true">
        {done}/{total}
      </span>
    </div>
  );
}

/**
 * The tap that lets the browser play sound. Usable without reading: the
 * student's portrait and a big play button.
 */
function StartScreen({ look, onStart }: { look: AvatarLook; onStart(): void }) {
  const start = useRef<HTMLDivElement>(null);
  useEffect(() => {
    start.current?.querySelector("button")?.focus();
  }, []);
  return (
    <div className={classes.message}>
      <Stack align="center" gap="lg">
        <Portrait
          look={look}
          expression="happy"
          size={160}
          label={shellT("avatar")}
        />
        <div ref={start}>
          <IconButton tone="student" label={shellT("start")} onClick={onStart}>
            <Icon name="play" size={48} />
          </IconButton>
        </div>
      </Stack>
    </div>
  );
}

/** The game contract's Avatar prop: the student's portrait, already dressed in their look. */
function avatarFor(look: AvatarLook) {
  return function StudentAvatar({
    expression,
    size,
  }: {
    expression: AvatarExpression;
    size: number;
  }) {
    return (
      <Portrait
        look={look}
        expression={expression}
        size={size}
        label={shellT("avatar")}
      />
    );
  };
}

/**
 * Asks before leaving, so a stray tap doesn't end a play. The answers are a
 * play icon and the same door icon the student just tapped.
 */
function LeaveQuestion({
  look,
  speak,
  onStay,
  onLeave,
}: {
  look: AvatarLook;
  speak?: VoiceOptions["speak"];
  onStay(): void;
  onLeave(): void;
}) {
  return (
    <Question line="leave-question" look={look} speak={speak} onCancel={onStay}>
      <IconButton
        tone="student"
        label={shellT("keep-playing")}
        onClick={onStay}
      >
        <Icon name="play" size={32} />
      </IconButton>
      <IconButton tone="neutral" label={shellT("leave")} onClick={onLeave}>
        <Icon name="leave" size={32} />
      </IconButton>
    </Question>
  );
}

function EndScreen({
  ending,
  look,
  onPlayAgain,
  speak,
}: {
  ending: Ending;
  look: AvatarLook;
  onPlayAgain(): void;
  speak?: VoiceOptions["speak"];
}) {
  const line = ending === "finished" ? "complete" : "left";
  useShellLine(line, speak);
  return (
    <main className={classes.message}>
      <Stack align="center" gap="lg">
        <Portrait
          look={look}
          expression={ending === "finished" ? "cheering" : "happy"}
          size={160}
          label={shellT("avatar")}
        />
        <Title order={1} size="h2">
          {shellT(line)}
        </Title>
        <IconButton label={shellT("play-again")} onClick={onPlayAgain}>
          <Icon name="replay" size={32} />
        </IconButton>
      </Stack>
    </main>
  );
}
