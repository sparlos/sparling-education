import { Portrait } from "@repo/avatar/portrait";
import type {
  AvatarExpression,
  GameManifest,
  GameProps,
  Progress,
} from "@repo/game-contract";
import { ClassColourScope } from "@repo/ui/class-colour-scope";
import { Icon } from "@repo/ui/icon";
import { IconButton } from "@repo/ui/icon-button";
import { Progress as ProgressBar } from "@repo/ui/progress";
import { Stack } from "@repo/ui/stack";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { GameRegistry } from "../games.ts";
import {
  type AvatarLook,
  type DressedStudent,
  type Membership,
  NotAStudent,
  type Platform,
  type Student,
} from "../platform/ports.ts";
import { boot, type ReadyPlay } from "../play/boot.ts";
import type { OutboxOptions } from "../play/outbox.ts";
import type { Ending } from "../play/play.ts";
import { parseRoute } from "../play/routes.ts";
import type { KeyValueStore } from "../play/storage.ts";
import { translator } from "../play/strings.ts";
import {
  createVoice,
  createVoiceGate,
  type Voice,
  type VoiceOptions,
} from "../play/voice.ts";
import { type LineMap, resolveLineUrl } from "../play/voice-lines.ts";
import classes from "./app.module.css";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import {
  GradePick,
  HomePage,
  JoinPage,
  SignInPage,
  WardrobePage,
} from "./Home.tsx";
import {
  Message,
  noRecordings,
  Question,
  ShellLines,
  ShellVoiceGate,
  SpokenMessage,
  shellT,
  ToHome,
} from "./shared.tsx";
import { TooSmall, useTooSmall } from "./TooSmall.tsx";
import { AvatarDesign } from "./Wardrobe.tsx";

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
  /** Each game's recorded title, by slug; a game without one is said by browser speech. */
  titleLines?: LineMap;
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
  | { kind: "not-a-student" }
  | { kind: "no-such-class" }
  | { kind: "game-off" }
  | { kind: "design"; student: Student }
  | { kind: "pick-grade"; student: DressedStudent; membership: Membership }
  | { kind: "playing"; ready: ReadyPlay }
  | { kind: "ending"; ready: ReadyPlay };

/**
 * The shell: home, joining a class, sign-in, or a game, by the URL.
 * On a screen too small to play on, a block covers it all; the page stays
 * underneath as it was, inert and silent, until the screen is big enough.
 */
export function App(props: AppProps) {
  const { shellLines, titleLines } = props;
  const recordings = useMemo(
    () =>
      shellLines || titleLines
        ? { shell: shellLines ?? {}, titles: titleLines ?? {} }
        : noRecordings,
    [shellLines, titleLines],
  );
  const gate = useMemo(createVoiceGate, []);
  const tooSmall = useTooSmall();
  return (
    <ShellLines.Provider value={recordings}>
      {/* Outside the gate's provider: the block's own line is the one that's heard. */}
      {tooSmall && <TooSmall gate={gate} speak={props.speak} />}
      <ShellVoiceGate.Provider value={gate}>
        <div className={classes.page} inert={tooSmall}>
          <RoutedScreen {...props} />
        </div>
      </ShellVoiceGate.Provider>
    </ShellLines.Provider>
  );
}

function RoutedScreen(props: AppProps) {
  const route = useMemo(
    () => parseRoute(props.url, props.base),
    [props.url, props.base],
  );
  switch (route?.kind) {
    case "home":
      return <HomePage {...props} />;
    case "join":
      return <JoinPage {...props} joinCode={route.joinCode} />;
    case "sign-in":
      return <SignInPage {...props} />;
    case "wardrobe":
      return <WardrobePage {...props} />;
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
        if (result.kind === "home") return navigate(base);
        if (result.kind !== "ready") return setScreen(result);
        ready = result.ready;
        setScreen({ kind: "playing", ready });
      },
      (error: unknown) => {
        if (cancelled) return;
        if (error instanceof NotAStudent)
          return setScreen({ kind: "not-a-student" });
        console.error("[play] Couldn't start the game", error);
        setScreen({ kind: "error" });
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

  // However a play ends, the student goes back home.
  const end = useCallback(
    (ready: ReadyPlay, ending: Ending) => {
      setScreen({ kind: "ending", ready });
      void ready.play.end(ending, props.finishTimeoutMs).then(navigate);
    },
    [navigate, props.finishTimeoutMs],
  );
  const toHome = <ToHome onClick={() => navigate(base)} />;

  switch (screen.kind) {
    case "loading":
      return <Message text={shellT("loading")} busy />;
    case "not-found":
      return <Message text={shellT("not-found")} />;
    case "not-a-student":
      return <SpokenMessage line="for-students" speak={props.speak} />;
    case "no-such-class":
    case "game-off":
      return (
        <SpokenMessage line={screen.kind} speak={props.speak}>
          {toHome}
        </SpokenMessage>
      );
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
    case "design":
      // Before anything else, even a game. Then the game opens as linked.
      return (
        <AvatarDesign
          mode="first"
          student={screen.student}
          platform={platform}
          speak={props.speak}
          onDone={() => navigate(url.href)}
          onError={() => setScreen({ kind: "error" })}
        />
      );
    case "pick-grade":
      // A game link joined them to a split class. Then the game opens as linked.
      return (
        <GradePick
          student={screen.student}
          membership={screen.membership}
          platform={platform}
          speak={props.speak}
          onPicked={() => navigate(url.href)}
          onError={() => setScreen({ kind: "error" })}
        />
      );
    case "playing":
    case "ending":
      return (
        <PlayScreen
          ready={screen.ready}
          ending={screen.kind === "ending"}
          onEnd={end}
          navigate={navigate}
          speak={props.speak}
        />
      );
  }
}

function PlayScreen({
  ready,
  ending,
  onEnd,
  navigate,
  speak,
}: {
  ready: ReadyPlay;
  ending: boolean;
  onEnd(ready: ReadyPlay, ending: Ending): void;
  navigate(url: string): void;
  speak?: VoiceOptions["speak"];
}) {
  const { game, student, tier, play } = ready;
  const [hasLine, setHasLine] = useState(false);
  const [asking, setAsking] = useState(false);
  // Browsers block sound until the page is tapped, so every game waits for
  // a tap on start before its first line.
  const [started, setStarted] = useState(false);
  // Fixed when the student taps start, from whatever the platform has said by then.
  const [firstPlay, setFirstPlay] = useState(true);
  const [progress, setProgress] = useState<Progress | null>(null);
  const gate = useContext(ShellVoiceGate);
  const voice = useMemo<Voice>(
    () =>
      createVoice({
        text: translator(game.manifest.strings, student.locale),
        locale: student.locale,
        lineUrl: (id) => resolveLineUrl(game, student.locale, id),
        speak,
        gate,
      }),
    [game, student, speak, gate],
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
      firstPlay,
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
    [game, student, tier, firstPlay, play, voice, endOnce],
  );

  // The shell around the game is in the colour of the class it counts for.
  return (
    <ClassColourScope
      as="main"
      colour={ready.membership.classColour}
      className={classes.play}
      aria-busy={ending}
    >
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
            fallback={
              <Message text={shellT("error")}>
                {/* Ending again only gives back the crashed play's link home. */}
                <ToHome
                  onClick={() => void play.end("crashed").then(navigate)}
                />
              </Message>
            }
          >
            {started ? (
              <game.Component {...props} />
            ) : (
              <StartScreen
                look={student.look}
                onStart={() => {
                  setFirstPlay(ready.firstPlay());
                  setStarted(true);
                }}
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
    </ClassColourScope>
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
    <div className={classes.progress} data-tone="accent">
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
          <IconButton tone="accent" label={shellT("start")} onClick={onStart}>
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
      <IconButton tone="accent" label={shellT("keep-playing")} onClick={onStay}>
        <Icon name="play" size={32} />
      </IconButton>
      <IconButton tone="neutral" label={shellT("leave")} onClick={onLeave}>
        <Icon name="leave" size={32} />
      </IconButton>
    </Question>
  );
}
