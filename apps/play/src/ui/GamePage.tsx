// One game, at its game link: booting a play, the screens around the game
// itself (start, leave, progress, sound and voice controls) and sending the
// player back when it ends. Shared by the play shell and the try site, so it
// holds nothing about home, the wardrobe or sign-in.
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
import {
  type ReactNode,
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
  type GamePlatform,
  type Membership,
  NotAStudent,
  type Student,
} from "../platform/ports.ts";
import { boot, type ReadyPlay } from "../play/boot.ts";
import type { OutboxOptions } from "../play/outbox.ts";
import type { Ending } from "../play/play.ts";
import { createSounds } from "../play/sounds.ts";
import type { KeyValueStore } from "../play/storage.ts";
import { translator } from "../play/strings.ts";
import { createVoice, type Voice, type VoiceOptions } from "../play/voice.ts";
import { resolveLineUrl } from "../play/voice-lines.ts";
import classes from "./app.module.css";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import {
  Message,
  Question,
  ShellVoiceGate,
  SpokenMessage,
  shellT,
  ToHome,
} from "./shared.tsx";
import { splashArt } from "./splash-art.ts";

/**
 * Screens a student may need before a game opens. A site where nobody has
 * an account leaves them out.
 */
export interface GameSetup {
  design(student: Student, onDone: () => void, onError: () => void): ReactNode;
  pickGrade(
    student: DressedStudent,
    membership: Membership,
    onPicked: () => void,
    onError: () => void,
  ): ReactNode;
}

export interface GamePageProps {
  url: URL;
  /** The shell's base path, e.g. "/play/". */
  base: string;
  platform: GamePlatform;
  games: GameRegistry;
  storage: KeyValueStore | null;
  /** Leaves the shell for another page. */
  navigate(url: string): void;
  newId(): string;
  setup?: GameSetup;
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

export function GamePage(props: GamePageProps) {
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
        props.setup?.design(
          screen.student,
          () => navigate(url.href),
          () => setScreen({ kind: "error" }),
        ) ?? <Message text={shellT("error")} />
      );
    case "pick-grade":
      // A game link joined them to a split class. Then the game opens as linked.
      return (
        props.setup?.pickGrade(
          screen.student,
          screen.membership,
          () => navigate(url.href),
          () => setScreen({ kind: "error" }),
        ) ?? <Message text={shellT("error")} />
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
          storage={storage}
        />
      );
  }
}

/** Whether the student has turned off music and sounds in this browser. */
const mutedKey = "sounds.muted";

function PlayScreen({
  ready,
  ending,
  onEnd,
  navigate,
  speak,
  storage,
}: {
  ready: ReadyPlay;
  ending: boolean;
  onEnd(ready: ReadyPlay, ending: Ending): void;
  navigate(url: string): void;
  speak?: VoiceOptions["speak"];
  storage: KeyValueStore | null;
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
  const sounds = useMemo(() => createSounds(game.sounds), [game]);
  const voice = useMemo<Voice>(
    () =>
      createVoice({
        text: translator(game.manifest.strings, student.locale),
        locale: student.locale,
        lineUrl: (id) => resolveLineUrl(game, student.locale, id),
        speak,
        gate,
        duck: sounds.duck,
      }),
    [game, student, speak, gate, sounds],
  );
  useEffect(() => () => voice.stop(), [voice]);
  useEffect(() => () => sounds.close(), [sounds]);
  // What silences the voice (the too-small screen) silences sounds too.
  useEffect(
    () => gate?.listen((closed) => (closed ? sounds.hold() : sounds.release())),
    [gate, sounds],
  );
  // The leave question is said over the game's music.
  useEffect(() => (asking ? sounds.duck() : undefined), [asking, sounds]);
  // The student's choice, kept in this browser for their next games. The voice
  // stays on: students rely on it.
  const [muted, setMuted] = useState(
    () => storage?.getItem(mutedKey) === "true",
  );
  useEffect(() => sounds.mute(muted), [muted, sounds]);

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
      playSound: (id, options) => sounds.play(id, options),
      playMusic: (id) => sounds.music(id),
      onAttempt: (attempt) => play.record(attempt),
      onProgress: (next) => setProgress(next),
      onFinish: () => endOnce("finished"),
    }),
    [game, student, tier, firstPlay, play, voice, sounds, endOnce],
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
        <div className={classes.soundControls}>
          {/* A game with no sounds has nothing for it to turn off. */}
          {game.sounds && (
            <IconButton
              tone="neutral"
              label={shellT(muted ? "sounds-on" : "sounds-off")}
              onClick={() => {
                setMuted(!muted);
                storage?.setItem(mutedKey, String(!muted));
              }}
            >
              <Icon name={muted ? "music-off" : "music"} size={32} />
            </IconButton>
          )}
          <IconButton
            tone="neutral"
            label={shellT("hear-again")}
            onClick={() => voice.again()}
            disabled={!hasLine}
          >
            <Icon name="speaker" size={32} />
          </IconButton>
        </div>
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
                splash={splashArt[game.manifest.slug]}
                onStart={() => {
                  sounds.start();
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
function StartScreen({
  look,
  splash,
  onStart,
}: {
  look: AvatarLook;
  /** The game's splash image, behind the portrait and button. */
  splash?: string;
  onStart(): void;
}) {
  const start = useRef<HTMLDivElement>(null);
  useEffect(() => {
    start.current?.querySelector("button")?.focus();
  }, []);
  // A tap on the button also reaches the screen; start only once.
  const started = useRef(false);
  const startOnce = () => {
    if (started.current) return;
    started.current = true;
    onStart();
  };
  return (
    // A tap anywhere starts. Keyboards and screen readers use the button.
    // biome-ignore lint/a11y/noStaticElementInteractions: the button is the accessible way in
    // biome-ignore lint/a11y/useKeyWithClickEvents: the button takes the keyboard
    <div
      className={classes.start}
      style={splash ? { backgroundImage: `url("${splash}")` } : undefined}
      onClick={startOnce}
    >
      <div ref={start} className={classes.startButton}>
        <IconButton tone="accent" label={shellT("start")} onClick={startOnce}>
          <Icon name="play" size={48} />
        </IconButton>
      </div>
      <div className={classes.startAvatar}>
        <Portrait
          look={look}
          expression="happy"
          size={160}
          label={shellT("avatar")}
        />
      </div>
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
